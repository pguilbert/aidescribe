export const PROVIDER_IDS = ["openai", "anthropic", "mistral"] as const;
export type AiProvider = (typeof PROVIDER_IDS)[number];
export type CommitType = "conventional" | "plain";

export const PROVIDER_DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: "gpt-5-mini",
  anthropic: "claude-haiku-4-5",
  mistral: "mistral-small-latest",
};

type ProviderConfigKeyType = "apiKey" | "model" | "baseURL";
type ProviderConfigKey = `providers.${AiProvider}.${ProviderConfigKeyType}`;

export type ConfigKey =
  | "provider"
  | "locale"
  | "type"
  | "maxLength"
  | "maxDiffChars"
  | ProviderConfigKey;

const PROVIDER_CONFIG_KEYS = PROVIDER_IDS.flatMap((provider) =>
  ["apiKey", "model", "baseURL"].map(
    (key) => `providers.${provider}.${key}` as ProviderConfigKey,
  ),
);

export const DEFAULT_CONFIG: Config = {
  provider: "openai",
  locale: "en",
  type: "conventional",
  maxLength: 72,
  maxDiffChars: 40_000,
  "providers.openai.model": PROVIDER_DEFAULT_MODELS.openai,
  "providers.anthropic.model": PROVIDER_DEFAULT_MODELS.anthropic,
  "providers.mistral.model": PROVIDER_DEFAULT_MODELS.mistral,
};

export const CONFIG_KEYS: readonly ConfigKey[] = [
  "provider",
  "locale",
  "type",
  "maxLength",
  "maxDiffChars",
  ...PROVIDER_CONFIG_KEYS,
];

export type Config = {
  provider: AiProvider;
  locale: string;
  type: CommitType;
  maxLength: number;
  maxDiffChars: number;
} & Record<`providers.${AiProvider}.model`, string> &
  Partial<Record<`providers.${AiProvider}.apiKey` | `providers.${AiProvider}.baseURL`, string>>;

export type ConfigInput = Partial<Record<ConfigKey, unknown>>;

export const SENSITIVE_CONFIG_KEYS: ConfigKey[] = PROVIDER_IDS.map(
  (provider) => `providers.${provider}.apiKey` as ConfigKey,
);

export const isConfigKey = (value: string): value is ConfigKey =>
  (CONFIG_KEYS as readonly string[]).includes(value);

export const getProviderConfig = (config: Config, provider: AiProvider) => ({
  provider,
  apiKey: config[`providers.${provider}.apiKey`],
  model: config[`providers.${provider}.model`],
  baseURL: config[`providers.${provider}.baseURL`],
});

export const getActiveProviderConfig = (config: Config) => getProviderConfig(config, config.provider);
