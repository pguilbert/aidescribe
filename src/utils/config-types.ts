export type AiProvider = "openai" | "anthropic";
export type CommitType = "conventional" | "plain";

export const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

export const DEFAULT_CONFIG = {
  provider: "openai" as AiProvider,
  locale: "en",
  type: "conventional" as CommitType,
  maxLength: 72,
  maxDiffChars: 40_000,
  "openai.apiKey": undefined as string | undefined,
  "openai.model": DEFAULT_OPENAI_MODEL,
  "anthropic.apiKey": undefined as string | undefined,
  "anthropic.model": DEFAULT_ANTHROPIC_MODEL,
};

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

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export type Config = {
  provider: AiProvider;
  locale: string;
  type: CommitType;
  maxLength: number;
  maxDiffChars: number;
  "openai.apiKey"?: string;
  "openai.model": string;
  "anthropic.apiKey"?: string;
  "anthropic.model": string;
};

export type ConfigInput = Partial<Record<ConfigKey, unknown>>;

export const SENSITIVE_CONFIG_KEYS: ConfigKey[] = [
  "openai.apiKey",
  "anthropic.apiKey",
];

export const isConfigKey = (value: string): value is ConfigKey =>
  (CONFIG_KEYS as readonly string[]).includes(value);

export const getActiveProviderConfig = (config: Config) => ({
  apiKey: config[`${config.provider}.apiKey`],
  model: config[`${config.provider}.model`],
});
