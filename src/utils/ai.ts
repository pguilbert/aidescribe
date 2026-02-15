import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { ValidConfig } from "./config-types.js";
import { KnownError } from "./error.js";
import { generatePrompt } from "./prompt.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

type GenerateDescriptionOptions = {
  verbose?: boolean;
  currentDescriptions?: string[];
};

const printVerbosePayload = (
  config: ValidConfig,
  systemPrompt: string,
  prompt: string,
) => {
  const lines = [
    "[aidescribe] AI request payload",
    `provider=${config.provider}`,
    `model=${config.model}`,
  ];

  if (config.provider === "openai") {
    lines.push("baseURL=https://api.openai.com/v1");
    lines.push("apiMode=openai-default");
  } else {
    lines.push("baseURL=https://api.anthropic.com/v1");
    lines.push("apiMode=anthropic-messages");
  }

  lines.push("", "[system]", systemPrompt, "", "[prompt]", prompt, "");
  process.stderr.write(`${lines.join("\n")}\n`);
};

const printVerboseResponse = (
  rawText: string,
  finishReason: string,
  warnings: unknown,
) => {
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

const truncateToLength = (message: string, maxLength: number) =>
  message.length > maxLength ? message.slice(0, maxLength).trim() : message;

type ProviderResult = {
  rawText: string;
  finishReason: string;
  warnings: unknown;
  reasoningText: string;
};

const resolveModel = (config: ValidConfig) => {
  const provider =
    config.provider === "openai"
      ? createOpenAI({ apiKey: config.apiKey })
      : createAnthropic({ apiKey: config.apiKey });
  return provider(config.model);
};

const generateWithProvider = async (
  diffForModel: string,
  config: ValidConfig,
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

export const generateDescription = async (
  diff: string,
  config: ValidConfig,
  options?: GenerateDescriptionOptions,
) => {
  if (!config.apiKey) {
    const requiredKey =
      config.provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    throw new KnownError(`${requiredKey} is required.`);
  }

  const diffForModel =
    diff.length > config["max-diff-chars"]
      ? `${diff.slice(-config["max-diff-chars"])}\n\n[Diff truncated due to size]`
      : diff;

  const systemPrompt = generatePrompt(
    config.locale,
    config["max-length"],
    config.type,
    options?.currentDescriptions ?? [],
  );

  if (options?.verbose) {
    printVerbosePayload(config, systemPrompt, diffForModel);
  }

  const providerResult = await generateWithProvider(
    diffForModel,
    config,
    systemPrompt,
  );

  if (options?.verbose) {
    printVerboseResponse(
      providerResult.rawText,
      providerResult.finishReason,
      providerResult.warnings,
    );
  }

  const message = providerResult.rawText.trim();

  if (!message) {
    throw new KnownError(
      `AI returned an empty description (finishReason=${providerResult.finishReason}). Re-run with --verbose to inspect provider output.`,
    );
  }

  return truncateToLength(message, config["max-length"]);
};
