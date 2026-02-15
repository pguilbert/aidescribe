import {
  cancel as cancelPrompt,
  intro,
  isCancel,
  outro,
  spinner,
  text,
} from "@clack/prompts";
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

const isInteractive = () =>
  Boolean(process.stdout.isTTY && process.stdin.isTTY && !process.env.CI);

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
    const interactive = isInteractive();
    const detailedProgress = Boolean(flags.verbose);

    if (interactive && detailedProgress) {
      intro("aidescribe");
    }

    const s = interactive && detailedProgress ? spinner() : null;

    s?.start("Checking repository");
    await assertJjRepo();
    s?.stop("Repository detected");

    s?.start("Loading configuration");
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
    s?.stop("Configuration loaded");

    if (!config.OPENAI_API_KEY) {
      throw new KnownError(
        "OPENAI_API_KEY is required. Set it with `aidescribe config set OPENAI_API_KEY=...`, env var, or `--ai-api-key`.",
      );
    }

    const forwardedArgs = getForwardedJjDescribeArgs(rawArgv);
    const diffArgs = parseDescribeArgsForDiff(forwardedArgs);

    s?.start("Reading `jj diff`");
    const diff = await getDiff(diffArgs);
    s?.stop("Diff collected");

    if (!diff) {
      if (interactive) {
        outro("No changes found in `jj diff`. Skipping description update.");
      } else {
        console.log(
          "No changes found in `jj diff`. Skipping description update.",
        );
      }
      return;
    }

    s?.start("Reading current description");
    const currentDescriptions = await getCurrentDescriptions(diffArgs);
    s?.stop(
      currentDescriptions.length > 0
        ? "Current description loaded"
        : "No current description found",
    );

    if (interactive && !detailedProgress) {
      console.log("Generating description...");
    }
    s?.start("Generating description");
    const generated = await generateDescription(diff, config, {
      verbose: flags.verbose,
      currentDescriptions,
    });
    s?.stop("Description generated");

    let finalMessage = generated;
    if (interactive) {
      const reviewed = await reviewDescription(generated);
      if (!reviewed) {
        cancelPrompt("Cancelled");
        return;
      }
      finalMessage = reviewed;
    } else {
      console.log(`Generated description: ${generated}`);
    }

    s?.start("Running `jj describe`");
    await runJjDescribe(finalMessage, forwardedArgs);
    s?.stop("Description applied");

    if (interactive) {
      outro("Done");
    }
  })().catch(handleCommandError);
