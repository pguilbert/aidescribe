import { cancel, intro, isCancel, outro, select, spinner, text } from "@clack/prompts";
import { bgLightRed, black } from "kolorist";
import { getConfig } from "../utils/config-runtime.js";
import { getActiveProviderConfig } from "../utils/config-types.js";
import { parseDescribeArgsForDiff } from "../utils/describe-args.js";
import { KnownError, handleCommandError } from "../utils/error.js";
import { generateDescription } from "../utils/ai.js";
import { assertJjRepo, getCurrentDescriptions, getDiff, runJjDescribe } from "../utils/jj.js";
import { runConnectWizard } from "./connect.js";

type MainFlags = {
  provider?: string;
  locale?: string;
  type?: string;
  maxLength?: number;
  maxDiffChars?: number;
  count?: number;
  verbose?: boolean;
};

const chooseDescription = async (generated: string[]) => {
  if (generated.length <= 1) {
    return generated[0] ?? null;
  }

  const selected = await select({
    message: "Choose a description",
    options: generated.map((value) => ({ value, label: value })),
  });

  if (isCancel(selected)) {
    return null;
  }

  return String(selected);
};

const reviewDescription = async (generated: string) => {
  const edited = await text({
    message: "Edit description",
    placeholder: generated,
    initialValue: generated,
    validate: (value: string | undefined) =>
      value && value.trim().length > 0 ? undefined : "Description cannot be empty",
  });

  if (isCancel(edited)) {
    return null;
  }

  return String(edited).trim();
};

export default async (flags: MainFlags, rawArgv: string[]) =>
  (async () => {
    const defaultSpinner = spinner();
    const verbose = flags.verbose ? spinner() : null;
    const cliConfig = {
      provider: flags.provider,
      locale: flags.locale,
      type: flags.type,
      maxLength: flags.maxLength,
      maxDiffChars: flags.maxDiffChars,
      variantCount: flags.count,
    };

    intro(bgLightRed(black(" aidescribe ✨ ")));

    verbose?.start("Checking repository");
    await assertJjRepo();
    verbose?.stop("Repository detected");

    verbose?.start("Loading configuration");
    let config = await getConfig({ cliConfig });
    verbose?.stop("Configuration loaded");

    if (!getActiveProviderConfig(config).apiKey) {
      defaultSpinner.start("No provider configured, launching `aidescribe connect`");
      defaultSpinner.stop("No provider configured, launching setup wizard");

      const connected = await runConnectWizard();
      if (!connected) {
        return;
      }

      verbose?.start("Reloading configuration");
      config = await getConfig({ cliConfig });
      verbose?.stop("Configuration reloaded");
    }

    if (!getActiveProviderConfig(config).apiKey) {
      throw new KnownError(
        `apiKey is required for provider "${config.provider}". Set it with \`aidescribe config set providers.${config.provider}.apiKey=...\`.`,
      );
    }

    const diffArgs = parseDescribeArgsForDiff(rawArgv);

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

    const selected = await chooseDescription(generated);
    if (!selected) {
      cancel("Cancelled");
      return;
    }

    const reviewed = await reviewDescription(selected);
    if (!reviewed) {
      cancel("Cancelled");
      return;
    }
    const finalMessage = reviewed;

    verbose?.start("Running `jj describe`");
    await runJjDescribe(finalMessage, diffArgs.revsets);
    verbose?.stop("Description applied");

    outro("Done");
  })().catch(handleCommandError);
