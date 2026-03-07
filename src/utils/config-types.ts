import { getProviderDefaultCommand, PROVIDER_IDS, type AiProvider } from "./providers.js";

export { PROVIDER_IDS, type AiProvider };
export type CommitType = "conventional" | "plain";

export const PROVIDER_CONFIG_KEY_TYPES = ["model", "agent", "command"] as const;
export type ProviderConfigKeyType = (typeof PROVIDER_CONFIG_KEY_TYPES)[number];
type ProviderConfigKey = `providers.${AiProvider}.${ProviderConfigKeyType}`;

export type ConfigKey =
  | "provider"
  | "locale"
  | "type"
  | "maxLength"
  | "maxDiffChars"
  | ProviderConfigKey;

const PROVIDER_CONFIG_KEYS = PROVIDER_IDS.flatMap((provider) =>
  PROVIDER_CONFIG_KEY_TYPES.map((key) => `providers.${provider}.${key}` as ProviderConfigKey),
);

export const DEFAULT_CONFIG: Config = {
  provider: "opencode",
  locale: "en",
  type: "conventional",
  maxLength: 72,
  maxDiffChars: 40_000,
  "providers.opencode.command": getProviderDefaultCommand("opencode"),
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
} & Partial<Record<`providers.${AiProvider}.${ProviderConfigKeyType}`, string>>;

export type ConfigInput = Partial<Record<ConfigKey, unknown>>;

export const SENSITIVE_CONFIG_KEYS: ConfigKey[] = [];

export type ProviderAliasKey = ProviderConfigKeyType;

export const isProviderAliasKey = (value: string): value is ProviderAliasKey =>
  (PROVIDER_CONFIG_KEY_TYPES as readonly string[]).includes(value);

export const toProviderConfigKey = (provider: AiProvider, key: ProviderAliasKey) =>
  `providers.${provider}.${key}` as ConfigKey;

export const isConfigKey = (value: string): value is ConfigKey =>
  (CONFIG_KEYS as readonly string[]).includes(value);

export const getProviderConfig = (config: Config, provider: AiProvider) => ({
  provider,
  model: config[`providers.${provider}.model`],
  agent: config[`providers.${provider}.agent`],
  command: config[`providers.${provider}.command`],
});

export const getActiveProviderConfig = (config: Config) =>
  getProviderConfig(config, config.provider);
