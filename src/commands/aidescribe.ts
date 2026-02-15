import {
  cancel as cancelPrompt,
  intro,
  isCancel,
  outro,
  spinner,
  text,
} from "@clack/prompts";
import { bgLightRed, black } from "kolorist";
import { getConfig } from "../utils/config-runtime.js";
import { parseDescribeArgsForDiff } from "../utils/describe-args.js";
import { KnownError, handleCommandError } from "../utils/error.js";
import { getForwardedJjDescribeArgs } from "../utils/forwarded-args.js";
import { generateDescription } from "../utils/openai.js";
import {
  assertJjRepo,
  getCurrentDescriptions,
  getDiff,
  runJjDescribe,
} from "../utils/jj.js";

type MainFlags = {
  aiApiKey?: string;
  aiBaseUrl?: string;
  aiModel?: string;
  aiLocale?: string;
  aiType?: string;
  aiMaxLength?: number;
  aiMaxDiffChars?: number;
  verbose?: boolean;
};

const reviewDescription = async (generated: string) => {
  const edited = await text({
    message: "Edit description",
    placeholder: generated,
    initialValue: generated,
    validate: (value: string) =>
      value.trim().length > 0 ? undefined : "Description cannot be empty",
  });

  if (isCancel(edited)) {
    return null;
  }

  return String(edited).trim();
};

export default async (flags: MainFlags, rawArgv: string[]) =>
  (async () => {
    const defaultSpinner = spinner();
    const verbose = Boolean(flags.verbose) ? spinner() : null;

    intro(bgLightRed(black(" aidescribe ✨ ")));

    verbose?.start("Checking repository");
    await assertJjRepo();
    verbose?.stop("Repository detected");

    verbose?.start("Loading configuration");
    const config = await getConfig({
      OPENAI_API_KEY: flags.aiApiKey,
      OPENAI_BASE_URL: flags.aiBaseUrl,
      OPENAI_MODEL: flags.aiModel,
      locale: flags.aiLocale,
      type: flags.aiType,
      "max-length":
        typeof flags.aiMaxLength === "number"
          ? String(flags.aiMaxLength)
          : undefined,
      "max-diff-chars":
        typeof flags.aiMaxDiffChars === "number"
          ? String(flags.aiMaxDiffChars)
          : undefined,
    });
    verbose?.stop("Configuration loaded");

    if (!config.OPENAI_API_KEY) {
      throw new KnownError(
        "OPENAI_API_KEY is required. Set it with `aidescribe config set OPENAI_API_KEY=...`, env var, or `--ai-api-key`.",
      );
    }

    const forwardedArgs = getForwardedJjDescribeArgs(rawArgv);
    const diffArgs = parseDescribeArgsForDiff(forwardedArgs);

    verbose?.start("Reading `jj diff`");
    const diff = await getDiff(diffArgs);
    verbose?.stop("Diff collected");

    if (!diff) {
      outro("No changes found in `jj diff`. Skipping description update.");
      return;
    }

    verbose?.start("Reading current description");
    const currentDescriptions = await getCurrentDescriptions(diffArgs);
    verbose?.stop(
      currentDescriptions.length > 0
        ? "Current description loaded"
        : "No current description found",
    );

    defaultSpinner.start("Generating description");
    const generated = await generateDescription(diff, config, {
      verbose: flags.verbose,
      currentDescriptions,
    });
    defaultSpinner.stop("Description generated");

    const reviewed = await reviewDescription(generated);
    if (!reviewed) {
      cancelPrompt("Cancelled");
      return;
    }
    const finalMessage = reviewed;

    verbose?.start("Running `jj describe`");
    await runJjDescribe(finalMessage, forwardedArgs);
    verbose?.stop("Description applied");

    outro("Done");
  })().catch(handleCommandError);
