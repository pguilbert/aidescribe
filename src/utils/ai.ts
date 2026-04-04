import { generateText } from "ai";
import { type Config, getActiveProviderConfig } from "./config-types.js";
import { KnownError } from "./error.js";
import { generatePrompt } from "./prompt.js";
import { getProviderDefinition } from "./providers.js";

type GenerateDescriptionOptions = {
  verbose?: boolean;
  currentDescriptions?: string[];
};

const printVerbosePayload = (config: Config, systemPrompt: string, prompt: string) => {
  const activeProvider = getActiveProviderConfig(config);
  const providerDetails = getProviderDefinition(config.provider);
  const lines = [
    "[aidescribe] AI request payload",
    `provider=${config.provider}`,
    `model=${activeProvider.model}`,
  ];

  lines.push(`baseURL=${activeProvider.baseURL ?? providerDetails.defaultBaseURL}`);
  lines.push(`apiMode=${providerDetails.apiMode}`);

  lines.push("", "[system]", systemPrompt, "", "[prompt]", prompt, "");
  process.stderr.write(`${lines.join("\n")}\n`);
};

const printVerboseResponse = (rawText: string, finishReason: string, warnings: unknown) => {
  const lines = [
    "[aidescribe] AI response payload",
    `finishReason=${finishReason}`,
    `warnings=${warnings ? JSON.stringify(warnings) : "[]"}`,
    "",
    "[response.text]",
    rawText || "<empty>",
    "",
  ];

  process.stderr.write(`${lines.join("\n")}\n`);
};

const normalizeDescription = (message: string) => message.trim();

type ProviderResult = {
  rawText: string;
  finishReason: string;
  warnings: unknown;
  reasoningText: string;
};

const resolveModel = (config: Config) => {
  const activeProvider = getActiveProviderConfig(config);
  const provider = getProviderDefinition(config.provider);
  return provider.createClient({
    apiKey: activeProvider.apiKey,
    baseURL: activeProvider.baseURL,
  })(activeProvider.model);
};

const generateWithProvider = async (
  diffForModel: string,
  config: Config,
  systemPrompt: string,
): Promise<ProviderResult> => {
  const model = resolveModel(config);
  const result = await generateText({
    model,
    maxRetries: 2,
    system: systemPrompt,
    prompt: diffForModel,
  });

  return {
    rawText: result.text,
    finishReason: result.finishReason,
    warnings: result.warnings,
    reasoningText: result.reasoningText ?? "",
  };
};

const generateSingleDescription = async (
  diffForModel: string,
  config: Config,
  systemPrompt: string,
  verbose?: boolean,
) => {
  const activeProvider = getActiveProviderConfig(config);

  let providerResult: ProviderResult;
  try {
    providerResult = await generateWithProvider(diffForModel, config, systemPrompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new KnownError(
      `AI request failed for provider "${config.provider}" (model "${activeProvider.model}"): ${message}`,
    );
  }

  if (verbose) {
    printVerboseResponse(
      providerResult.rawText,
      providerResult.finishReason,
      providerResult.warnings,
    );
  }

  const message = normalizeDescription(providerResult.rawText);

  if (!message) {
    throw new KnownError(
      `AI returned an empty description (finishReason=${providerResult.finishReason}). Re-run with --verbose to inspect provider output.`,
    );
  }

  return message;
};

export const generateDescription = async (
  diff: string,
  config: Config,
  options?: GenerateDescriptionOptions,
) => {
  const activeProvider = getActiveProviderConfig(config);
  if (!activeProvider.apiKey) {
    throw new KnownError("apiKey is required.");
  }

  const diffForModel =
    diff.length > config.maxDiffChars
      ? `${diff.slice(-config.maxDiffChars)}\n\n[Diff truncated due to size]`
      : diff;

  const systemPrompt = generatePrompt(
    config.locale,
    config.maxLength,
    config.type,
    options?.currentDescriptions ?? [],
  );

  if (options?.verbose) {
    printVerbosePayload(config, systemPrompt, diffForModel);
  }

  const generated = await Promise.all(
    Array.from({ length: config.variantCount }, () =>
      generateSingleDescription(diffForModel, config, systemPrompt, options?.verbose),
    ),
  );

  return [...new Set(generated)];
};
