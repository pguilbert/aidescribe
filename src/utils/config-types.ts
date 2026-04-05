import { getProviderDefaultModel, PROVIDER_IDS, type AiProvider } from "./providers.js";

export { PROVIDER_IDS, type AiProvider };
export type CommitType = "conventional" | "plain";

const PROVIDER_CONFIG_KEY_TYPES = ["apiKey", "model", "baseURL"] as const;
type ProviderConfigKeyType = (typeof PROVIDER_CONFIG_KEY_TYPES)[number];
type ProviderConfigKey = `providers.${AiProvider}.${ProviderConfigKeyType}`;

export type ConfigKey =
  | "provider"
  | "locale"
  | "type"
  | "maxLength"
  | "maxDiffChars"
  | "variantCount"
  | ProviderConfigKey;

const PROVIDER_CONFIG_KEYS = PROVIDER_IDS.flatMap((provider) =>
  PROVIDER_CONFIG_KEY_TYPES.map((key) => `providers.${provider}.${key}` as ProviderConfigKey),
);

export const DEFAULT_CONFIG: Config = {
  provider: "openai",
  locale: "en",
  type: "conventional",
  maxLength: 72,
  maxDiffChars: 40_000,
  variantCount: 1,
  "providers.openai.model": getProviderDefaultModel("openai"),
  "providers.anthropic.model": getProviderDefaultModel("anthropic"),
  "providers.mistral.model": getProviderDefaultModel("mistral"),
};

export const CONFIG_KEYS: readonly ConfigKey[] = [
  "provider",
  "locale",
  "type",
  "maxLength",
  "maxDiffChars",
  "variantCount",
  ...PROVIDER_CONFIG_KEYS,
];

export type Config = {
  provider: AiProvider;
  locale: string;
  type: CommitType;
  maxLength: number;
  maxDiffChars: number;
  variantCount: number;
} & Record<`providers.${AiProvider}.model`, string> &
  Partial<Record<`providers.${AiProvider}.apiKey` | `providers.${AiProvider}.baseURL`, string>>;

export type ConfigInput = Partial<Record<ConfigKey, unknown>>;

export const SENSITIVE_CONFIG_KEYS: ConfigKey[] = PROVIDER_IDS.map(
  (provider) => `providers.${provider}.apiKey` as ConfigKey,
);

type ProviderAliasKey = ProviderConfigKeyType;

export const isProviderAliasKey = (value: string): value is ProviderAliasKey =>
  (PROVIDER_CONFIG_KEY_TYPES as readonly string[]).includes(value);

export const toProviderConfigKey = (provider: AiProvider, key: ProviderAliasKey) =>
  `providers.${provider}.${key}` as ConfigKey;

export const isConfigKey = (value: string): value is ConfigKey =>
  (CONFIG_KEYS as readonly string[]).includes(value);

export const getProviderConfig = (config: Config, provider: AiProvider) => ({
  provider,
  apiKey: config[`providers.${provider}.apiKey`],
  model: config[`providers.${provider}.model`],
  baseURL: config[`providers.${provider}.baseURL`],
});

export const getActiveProviderConfig = (config: Config) =>
  getProviderConfig(config, config.provider);
