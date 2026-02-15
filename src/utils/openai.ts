import { createOpenAI } from "@ai-sdk/openai";
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
  const apiMode = isCustomBaseUrl(config.OPENAI_BASE_URL)
    ? "chat-completions (compat mode)"
    : "openai-default";

  const lines = [
    "[aidescribe] AI request payload",
    `model=${config.model}`,
    `baseURL=${config.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}`,
    `apiMode=${apiMode}`,
    "",
    "[system]",
    systemPrompt,
    "",
    "[prompt]",
    prompt,
    "",
  ];

  process.stderr.write(`${lines.join("\n")}\n`);
};

const getContentText = (
  content: Array<{ type: string; text?: string }>,
): string =>
  content
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

const isCustomBaseUrl = (baseUrl?: string) => {
  if (!baseUrl) {
    return false;
  }

  const normalized = baseUrl.toLowerCase();
  return (
    normalized !== "https://api.openai.com/v1" &&
    normalized !== "https://api.openai.com/v1/"
  );
};

const truncateToLength = (message: string, maxLength: number) =>
  message.length > maxLength ? message.slice(0, maxLength).trim() : message;

export const generateDescription = async (
  diff: string,
  config: ValidConfig,
  options?: GenerateDescriptionOptions,
) => {
  if (!config.OPENAI_API_KEY) {
    throw new KnownError("OPENAI_API_KEY is required.");
  }

  const diffForModel =
    diff.length > config["max-diff-chars"]
      ? `${diff.slice(-config["max-diff-chars"])}\n\n[Diff truncated due to size]`
      : diff;

  const provider = createOpenAI(
    config.OPENAI_BASE_URL
      ? { apiKey: config.OPENAI_API_KEY, baseURL: config.OPENAI_BASE_URL }
      : { apiKey: config.OPENAI_API_KEY },
  );

  const systemPrompt = generatePrompt(
    config.locale,
    config["max-length"],
    config.type,
    options?.currentDescriptions ?? [],
  );

  if (options?.verbose) {
    printVerbosePayload(config, systemPrompt, diffForModel);
  }

  const model = isCustomBaseUrl(config.OPENAI_BASE_URL)
    ? provider.chat(config.model)
    : provider(config.model);

  const result = await generateText({
    model,
    maxRetries: 2,
    system: systemPrompt,
    prompt: diffForModel,
  });

  const contentText = getContentText(
    result.content as Array<{ type: string; text?: string }>,
  );
  const bodyText = getResponseBodyText(result.response.body);

  if (options?.verbose) {
    printVerboseResponse(
      result.text,
      contentText,
      bodyText,
      result.finishReason,
      result.warnings,
    );
  }

  const message = sanitizeMessage(result.text, [
    contentText,
    result.reasoningText ?? "",
    bodyText,
  ]);

  if (!message) {
    throw new KnownError(
      `AI returned an empty description (finishReason=${result.finishReason}). Re-run with --verbose to inspect provider output.`,
    );
  }

  return truncateToLength(message, config["max-length"]);
};
