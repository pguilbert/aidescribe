export type AiProvider = "openai" | "anthropic";
export type CommitType = "conventional" | "plain";

export const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

export const DEFAULT_CONFIG = {
  provider: "openai" as const,
  locale: "en",
  type: "conventional" as const,
  maxLength: 72,
  maxDiffChars: 40_000,
  openai: {
    apiKey: undefined as string | undefined,
    model: DEFAULT_OPENAI_MODEL,
  },
  anthropic: {
    apiKey: undefined as string | undefined,
    model: DEFAULT_ANTHROPIC_MODEL,
  },
} as const;

export const CONFIG_KEYS = [
  "provider",
  "locale",
  "type",
  "maxLength",
  "maxDiffChars",
  "openai.apiKey",
  "openai.model",
  "anthropic.apiKey",
  "anthropic.model",
] as const;

export const TOP_LEVEL_CONFIG_KEYS = [
  "provider",
  "locale",
  "type",
  "maxLength",
  "maxDiffChars",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export type ProviderConfig = {
  apiKey?: string;
  model?: string;
};

export type Config = {
  provider: AiProvider;
  locale: string;
  type: CommitType;
  maxLength: number;
  maxDiffChars: number;
  openai: {
    apiKey?: string;
    model: string;
  };
  anthropic: {
    apiKey?: string;
    model: string;
  };
};

export type ConfigInput = {
  provider?: unknown;
  locale?: unknown;
  type?: unknown;
  maxLength?: unknown;
  maxDiffChars?: unknown;
  openai?: ProviderConfig;
  anthropic?: ProviderConfig;
};

export const SENSITIVE_CONFIG_KEYS: ConfigKey[] = [
  "openai.apiKey",
  "anthropic.apiKey",
];

export const isConfigKey = (value: string): value is ConfigKey =>
  (CONFIG_KEYS as readonly string[]).includes(value);
