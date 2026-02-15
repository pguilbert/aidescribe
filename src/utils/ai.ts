import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { ValidConfig } from "./config-types.js";
import { KnownError } from "./error.js";
import { generatePrompt } from "./prompt.js";

const extractResponseFromReasoning = (message: string): string => {
  const thinkPattern = /<think>[\s\S]*?<\/think>/gi;
  return message.replace(thinkPattern, "").trim();
};

const sanitizeLine = (line: string) =>
  line
    .trim()
    .replace(/^<[^>]*>\s*/, "")
    .replace(/^\s*[-*]\s+/, "")
    .replace(/(\w)\.$/, "$1")
    .replace(/^["'`]|["'`]$/g, "")
    .trim();

const extractFirstMeaningfulLine = (message: string) => {
  const lines = message
    .trim()
    .split("\n")
    .map((line) => sanitizeLine(line))
    .filter(Boolean);

  for (const line of lines) {
    if (line === "```") {
      continue;
    }
    return line;
  }

  return "";
};

const sanitizeMessage = (message: string, fallbackMessages: string[] = []) => {
  const candidates = [
    extractResponseFromReasoning(message),
    message,
    ...fallbackMessages,
  ];

  for (const candidate of candidates) {
    const firstLine = extractFirstMeaningfulLine(candidate);
    if (firstLine) {
      return firstLine;
    }
  }

  return "";
};

const collectTextValues = (value: unknown, acc: string[]) => {
  if (typeof value === "string") {
    acc.push(value);
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextValues(item, acc);
    }
    return;
  }

  const object = value as Record<string, unknown>;
  const keys = ["text", "output_text", "content"];

  for (const key of keys) {
    if (key in object) {
      collectTextValues(object[key], acc);
    }
  }

  for (const nestedValue of Object.values(object)) {
    if (nestedValue && typeof nestedValue === "object") {
      collectTextValues(nestedValue, acc);
    }
  }
};

const getResponseBodyText = (body: unknown): string => {
  const values: string[] = [];
  collectTextValues(body, values);
  return values.join("\n").trim();
};

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

const getContentText = (
  content: Array<{ type?: string; text?: string }> | undefined,
): string =>
  (content ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("\n")
    .trim();

const printVerboseResponse = (
  rawText: string,
  contentText: string,
  bodyText: string,
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
    "[response.content text parts]",
    contentText || "<empty>",
    "",
    "[response.body extracted text]",
    bodyText || "<empty>",
    "",
  ];

  process.stderr.write(`${lines.join("\n")}\n`);
};

const truncateToLength = (message: string, maxLength: number) =>
  message.length > maxLength ? message.slice(0, maxLength).trim() : message;

type ProviderResult = {
  rawText: string;
  contentText: string;
  bodyText: string;
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
  const contentText = getContentText(
    result.content as Array<{ type?: string; text?: string }>,
  );

  return {
    rawText: result.text,
    contentText,
    bodyText: getResponseBodyText(result.response.body),
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
      providerResult.contentText,
      providerResult.bodyText,
      providerResult.finishReason,
      providerResult.warnings,
    );
  }

  const message = sanitizeMessage(providerResult.rawText, [
    providerResult.contentText,
    providerResult.reasoningText,
    providerResult.bodyText,
  ]);

  if (!message) {
    throw new KnownError(
      `AI returned an empty description (finishReason=${providerResult.finishReason}). Re-run with --verbose to inspect provider output.`,
    );
  }

  return truncateToLength(message, config["max-length"]);
};
