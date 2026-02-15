import { KnownError } from "./error.js";

export const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

const aiProviders = ["openai", "anthropic"] as const;
export type AiProvider = (typeof aiProviders)[number];

const commitTypes = ["conventional", "plain"] as const;
export type CommitType = (typeof commitTypes)[number];

const { hasOwnProperty } = Object.prototype;
export const hasOwn = (object: unknown, key: PropertyKey) =>
  hasOwnProperty.call(object, key);

const parseAssert = (name: string, condition: boolean, message: string) => {
  if (!condition) {
    throw new KnownError(`Invalid config property ${name}: ${message}`);
  }
};

const configParsers = {
  AI_PROVIDER(provider?: unknown) {
    if (!provider) {
      return "openai" as AiProvider;
    }

    const providerValue = String(provider).toLowerCase();
    parseAssert(
      "AI_PROVIDER",
      aiProviders.includes(providerValue as AiProvider),
      'Invalid provider. Use "openai" or "anthropic".',
    );
    return providerValue as AiProvider;
  },
  OPENAI_API_KEY(key?: unknown) {
    if (!key) {
      return undefined;
    }
    return String(key);
  },
  ANTHROPIC_API_KEY(key?: unknown) {
    if (!key) {
      return undefined;
    }
    return String(key);
  },
  OPENAI_MODEL(model?: unknown) {
    if (!model) {
      return DEFAULT_OPENAI_MODEL;
    }
    return String(model);
  },
  ANTHROPIC_MODEL(model?: unknown) {
    if (!model) {
      return DEFAULT_ANTHROPIC_MODEL;
    }
    return String(model);
  },
  locale(locale?: unknown) {
    if (!locale) {
      return "en";
    }

    const localeValue = String(locale);
    parseAssert("locale", !!localeValue, "Cannot be empty");
    parseAssert(
      "locale",
      /^[a-z-]+$/i.test(localeValue),
      "Must be a valid locale (letters and dashes).",
    );

    return localeValue;
  },
  type(type?: unknown) {
    if (!type) {
      return "conventional" as CommitType;
    }

    const typeValue = String(type);
    parseAssert(
      "type",
      commitTypes.includes(typeValue as CommitType),
      'Invalid type. Use "conventional" or "plain".',
    );
    return typeValue as CommitType;
  },
  "max-length"(maxLength?: unknown) {
    if (!maxLength) {
      return 72;
    }

    const maxLengthValue = String(maxLength);
    parseAssert(
      "max-length",
      /^\d+$/.test(maxLengthValue),
      "Must be an integer",
    );
    const parsed = Number(maxLengthValue);
    parseAssert(
      "max-length",
      parsed >= 20,
      "Must be greater than or equal to 20 characters",
    );
    return parsed;
  },
  "max-diff-chars"(maxDiffChars?: unknown) {
    if (!maxDiffChars) {
      return 40_000;
    }

    const maxDiffCharsValue = String(maxDiffChars);
    parseAssert(
      "max-diff-chars",
      /^\d+$/.test(maxDiffCharsValue),
      "Must be an integer",
    );
    const parsed = Number(maxDiffCharsValue);
    parseAssert("max-diff-chars", parsed > 0, "Must be greater than 0");
    return parsed;
  },
} as const;

type ConfigKeys = keyof typeof configParsers;

type RawConfig = {
  [key in ConfigKeys]?: string;
};

export type ValidConfig = {
  [Key in ConfigKeys]: ReturnType<(typeof configParsers)[Key]>;
} & {
  provider: AiProvider;
  apiKey: string | undefined;
  model: string;
};

export { configParsers, type ConfigKeys, type RawConfig };
