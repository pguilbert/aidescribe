#!/usr/bin/env node

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
  cancel as cancelPrompt,
  confirm,
  intro,
  isCancel,
  outro,
  spinner,
  text,
} from "@clack/prompts";
import { cli } from "cleye";
import { execa } from "execa";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_MESSAGE_LENGTH = 72;
const DEFAULT_MAX_DIFF_CHARS = 40_000;

const isHelpArg = (arg: string) => arg === "-h" || arg === "--help";
const isInteractive = () =>
  Boolean(process.stdout.isTTY && process.stdin.isTTY && !process.env.CI);

const sanitizeMessage = (text: string) => {
  const firstLine = text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "";
  }

  return firstLine.replace(/(\w)\.$/, "$1").replace(/^["'`]|["'`]$/g, "");
};

const ensureJjRepo = async () => {
  const result = await execa("jj", ["root"], { reject: false });
  if (result.failed) {
    throw new Error("The current directory must be inside a jj repository.");
  }
};

const getDiff = async () => {
  const { stdout } = await execa("jj", ["--no-pager", "diff"]);
  return stdout.trim();
};

const readPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const reviewDescription = async (generatedMessage: string) => {
  const edited = await text({
    message: "Edit description",
    placeholder: generatedMessage,
    initialValue: generatedMessage,
    validate: (value: string) =>
      value.trim().length > 0 ? undefined : "Description cannot be empty",
  });

  if (isCancel(edited)) {
    return null;
  }

  return String(edited).trim();
};

const generateDescription = async (diff: string) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required. Set it before running aidescribe.",
    );
  }

  const modelName = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const baseURL = process.env.OPENAI_BASE_URL;
  const locale = process.env.AIDESCRIBE_LOCALE || "en";
  const maxMessageLength = readPositiveNumber(
    process.env.AIDESCRIBE_MAX_LENGTH,
    DEFAULT_MAX_MESSAGE_LENGTH,
  );
  const maxDiffChars = readPositiveNumber(
    process.env.AIDESCRIBE_MAX_DIFF_CHARS,
    DEFAULT_MAX_DIFF_CHARS,
  );

  const diffForModel =
    diff.length > maxDiffChars
      ? `${diff.slice(-maxDiffChars)}\n\n[Diff truncated due to size]`
      : diff;

  const provider = createOpenAI(baseURL ? { apiKey, baseURL } : { apiKey });

  const { text } = await generateText({
    model: provider(modelName),
    temperature: 0.2,
    maxRetries: 2,
    maxOutputTokens: 200,
    system: [
      "You generate concise commit titles for Jujutsu (jj) changes.",
      `Message language: ${locale}.`,
      `Message length must be at most ${maxMessageLength} characters.`,
      "Use imperative present tense.",
      "Return a single-line title only, with no quotes, prefixes, explanations, or markdown.",
    ].join("\n"),
    prompt: diffForModel,
  });

  const message = sanitizeMessage(text);
  if (!message) {
    throw new Error("AI returned an empty description.");
  }

  if (message.length > maxMessageLength) {
    return message.slice(0, maxMessageLength).trim();
  }

  return message;
};

const run = async (rawArgs: string[]) => {
  const interactive = isInteractive();
  if (interactive) {
    intro("aidescribe");
  }

  const s = interactive ? spinner() : null;

  s?.start("Checking repository");
  await ensureJjRepo();
  s?.stop("Repository detected");

  s?.start("Reading `jj diff`");
  const diff = await getDiff();
  s?.stop("Diff collected");

  if (!diff) {
    throw new Error("No changes found in `jj diff`.");
  }

  s?.start("Generating description");
  //   const message = "this is a test";
  const message = await generateDescription(diff);
  s?.stop("Description generated");

  let finalMessage = message;
  if (interactive) {
    const reviewed = await reviewDescription(message);
    if (!reviewed) {
      cancelPrompt("Cancelled");
      return;
    }
    finalMessage = reviewed;
  } else {
    console.log(`Generated description: ${message}`);
  }

  s?.start("Running `jj describe`");
  await execa("jj", ["describe", "-m", finalMessage, ...rawArgs], {
    stdio: "inherit",
  });
  s?.stop("Description applied");
  if (interactive) {
    outro("Done");
  }
};

const rawArgv = process.argv.slice(2);

if (rawArgv.some(isHelpArg)) {
  execa("jj", ["describe", ...rawArgv], { stdio: "inherit" }).catch((error) => {
    const err = error as Error;
    console.error(`aidescribe: ${err.message}`);
    process.exit(1);
  });
} else {
  cli(
    {
      name: "aidescribe",
      flags: {},
      help: {
        description:
          "Generate a jj description from `jj diff` and run `jj describe`.",
      },
      ignoreArgv: (type) => type === "unknown-flag" || type === "argument",
    },
    () => {
      run(rawArgv).catch((error) => {
        const err = error as Error;
        console.error(`aidescribe: ${err.message}`);
        process.exit(1);
      });
    },
    rawArgv,
  );
}
