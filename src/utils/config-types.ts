export type AiProvider = "openai" | "anthropic";
export type CommitType = "conventional" | "plain";

export const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

export type Config = {
  provider: AiProvider;
  apiKey?: string;
  model: string;
  locale: string;
  type: CommitType;
  maxLength: number;
  maxDiffChars: number;
};

export const DEFAULT_CONFIG: Config = {
  provider: "openai",
  apiKey: undefined,
  model: DEFAULT_OPENAI_MODEL,
  locale: "en",
  type: "conventional",
  maxLength: 72,
  maxDiffChars: 40_000,
} as const;

export const CONFIG_KEYS = Object.keys(DEFAULT_CONFIG);

export const SENSITIVE_CONFIG_KEYS: ConfigKey[] = ["apiKey"];

export type ConfigKey = keyof Config;

export type ConfigInput = Partial<Record<ConfigKey, unknown>>;

export const isConfigKey = (value: string): value is ConfigKey =>
  CONFIG_KEYS.includes(value);
