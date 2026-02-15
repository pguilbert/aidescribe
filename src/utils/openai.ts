import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { ValidConfig } from "./config-types.js";
import { KnownError } from "./error.js";
import { generatePrompt } from "./prompt.js";

const extractResponseFromReasoning = (message: string): string => {
  const thinkPattern = /<think>[\s\S]*?<\/think>/gi;
  return message.replace(thinkPattern, "").trim();
};

const sanitizeMessage = (message: string) => {
  const processed = extractResponseFromReasoning(message);
  const firstLine = processed
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "";
  }

  return firstLine
    .replace(/(\w)\.$/, "$1")
    .replace(/^["'`]|["'`]$/g, "")
    .replace(/^<[^>]*>\s*/, "");
};

export const generateDescription = async (
  diff: string,
  config: ValidConfig,
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

  const { text } = await generateText({
    model: provider(config.model),
    maxRetries: 2,
    maxOutputTokens: 200,
    system: generatePrompt(config.locale, config["max-length"], config.type),
    prompt: diffForModel,
  });

  const message = sanitizeMessage(text);
  if (!message) {
    throw new KnownError("AI returned an empty description.");
  }

  if (message.length > config["max-length"]) {
    return message.slice(0, config["max-length"]).trim();
  }

  return message;
};
