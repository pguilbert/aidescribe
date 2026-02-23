import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileExists } from "./fs.js";
import { KnownError } from "./error.js";
import {
  TOP_LEVEL_CONFIG_KEYS,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_CONFIG,
  type AiProvider,
  type CommitType,
  type Config,
  type ConfigInput,
  type ConfigKey,
  type ProviderConfig,
  isConfigKey,
} from "./config-types.js";

export const getConfigPath = () => path.join(os.homedir(), ".aidescribe.json");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseNonEmptyString = (value: unknown, name: string) => {
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new KnownError(`${name} must be a string.`);
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const parseProvider = (value: unknown): AiProvider | undefined => {
  const raw = parseNonEmptyString(value, "provider");
  if (!raw) {
    return undefined;
  }
  const normalized = raw.toLowerCase();
  if (normalized !== "openai" && normalized !== "anthropic") {
    throw new KnownError('provider must be "openai" or "anthropic".');
  }
  return normalized as AiProvider;
};

const parseCommitType = (value: unknown): CommitType | undefined => {
  const raw = parseNonEmptyString(value, "type");
  if (!raw) {
    return undefined;
  }
  if (raw !== "conventional" && raw !== "plain") {
    throw new KnownError('type must be "conventional" or "plain".');
  }
  return raw as CommitType;
};

const parseLocale = (value: unknown) => {
  const raw = parseNonEmptyString(value, "locale");
  if (!raw) {
    return undefined;
  }
  if (!/^[a-z-]+$/i.test(raw)) {
    throw new KnownError('locale must match letters and dashes (e.g. "en").');
  }
  return raw;
};

const parsePositiveInt = (value: unknown, name: string): number | undefined => {
  if (value == null) {
    return undefined;
  }
  const asNumber =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(asNumber) || asNumber <= 0) {
    throw new KnownError(`${name} must be a positive integer.`);
  }
  return asNumber;
};

const parseProviderConfig = (
  input: ProviderConfig | undefined,
  provider: AiProvider,
) => {
  const apiKey = parseNonEmptyString(
    input?.apiKey,
    `${provider}.apiKey`,
  );
  const model =
    parseNonEmptyString(input?.model, `${provider}.model`) ??
    (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OPENAI_MODEL);

  return { apiKey, model };
};

const parseConfig = (input: ConfigInput): Config => {
  const provider = parseProvider(input.provider) ?? DEFAULT_CONFIG.provider;
  const locale = parseLocale(input.locale) ?? DEFAULT_CONFIG.locale;
  const type = parseCommitType(input.type) ?? DEFAULT_CONFIG.type;
  const maxLength =
    parsePositiveInt(input.maxLength, "maxLength") ?? DEFAULT_CONFIG.maxLength;
  const maxDiffChars =
    parsePositiveInt(input.maxDiffChars, "maxDiffChars") ??
    DEFAULT_CONFIG.maxDiffChars;

  const openai = parseProviderConfig(input.openai, "openai");
  const anthropic = parseProviderConfig(input.anthropic, "anthropic");

  return {
    provider,
    locale,
    type,
    maxLength,
    maxDiffChars,
    openai,
    anthropic,
  };
};

const getEnvConfig = (): ConfigInput => {
  const envOrUndefined = (value: string | undefined) => {
    if (value == null) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const openaiApiKey = envOrUndefined(process.env.AIDESCRIBE_OPENAI_API_KEY);
  const openaiModel = envOrUndefined(process.env.AIDESCRIBE_OPENAI_MODEL);
  const anthropicApiKey = envOrUndefined(
    process.env.AIDESCRIBE_ANTHROPIC_API_KEY,
  );
  const anthropicModel = envOrUndefined(
    process.env.AIDESCRIBE_ANTHROPIC_MODEL,
  );

  return {
    provider: envOrUndefined(process.env.AIDESCRIBE_PROVIDER),
    locale: envOrUndefined(process.env.AIDESCRIBE_LOCALE),
    type: envOrUndefined(process.env.AIDESCRIBE_TYPE),
    maxLength: envOrUndefined(process.env.AIDESCRIBE_MAX_LENGTH),
    maxDiffChars: envOrUndefined(process.env.AIDESCRIBE_MAX_DIFF_CHARS),
    openai:
      openaiApiKey || openaiModel
        ? {
            apiKey: openaiApiKey,
            model: openaiModel,
          }
        : undefined,
    anthropic:
      anthropicApiKey || anthropicModel
        ? {
            apiKey: anthropicApiKey,
            model: anthropicModel,
          }
        : undefined,
  };
};

const parseConfigFile = (parsed: Record<string, unknown>, configPath: string) => {
  const rawConfig: ConfigInput = Object.create(null);

  for (const [key, value] of Object.entries(parsed)) {
    if (key === "openai" || key === "anthropic") {
      if (value == null) {
        continue;
      }
      if (!isRecord(value)) {
        throw new KnownError(
          `Invalid ${key} config in ${configPath}. Expected a JSON object.`,
        );
      }
      const providerConfig: ProviderConfig = Object.create(null);
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (nestedKey !== "apiKey" && nestedKey !== "model") {
          throw new KnownError(
            `Invalid ${key}.${nestedKey} in ${configPath}. Supported keys: apiKey, model.`,
          );
        }
        if (nestedKey === "apiKey") {
          providerConfig.apiKey = nestedValue as string | undefined;
        } else {
          providerConfig.model = nestedValue as string | undefined;
        }
      }
      rawConfig[key] = providerConfig;
      continue;
    }

    if (
      !TOP_LEVEL_CONFIG_KEYS.includes(
        key as (typeof TOP_LEVEL_CONFIG_KEYS)[number],
      )
    ) {
      const supported = [...TOP_LEVEL_CONFIG_KEYS, "openai", "anthropic"];
      throw new KnownError(
        `Invalid config key "${key}" in ${configPath}. Supported keys: ${supported.join(
          ", ",
        )}.`,
      );
    }

    const topLevelKey = key as (typeof TOP_LEVEL_CONFIG_KEYS)[number];
    (rawConfig as Record<(typeof TOP_LEVEL_CONFIG_KEYS)[number], unknown>)[
      topLevelKey
    ] = value;
  }

  return rawConfig;
};

const readConfigFile = async (): Promise<ConfigInput> => {
  const configPath = getConfigPath();
  const exists = await fileExists(configPath);
  if (!exists) {
    return Object.create(null);
  }

  const configString = await fs.readFile(configPath, "utf8");

  try {
    const parsed = JSON.parse(configString);
    if (!isRecord(parsed)) {
      throw new KnownError(
        `Invalid config file format at ${configPath}. Expected a JSON object.`,
      );
    }

    return parseConfigFile(parsed, configPath);
  } catch (error) {
    if (error instanceof KnownError) {
      throw error;
    }
    throw new KnownError(
      `Invalid config file format at ${configPath}. Expected a JSON object.`,
    );
  }
};

const mergeProviderConfig = (
  base: ProviderConfig | undefined,
  override: ProviderConfig | undefined,
) => ({
  ...(base ?? Object.create(null)),
  ...(override ?? Object.create(null)),
});

export const getConfig = async (
  cliConfig?: ConfigInput,
  envConfig?: ConfigInput,
): Promise<Config> => {
  const fileConfig = await readConfigFile();
  const effectiveEnvConfig = envConfig ?? getEnvConfig();

  const merged: ConfigInput = {
    ...fileConfig,
    ...effectiveEnvConfig,
    ...cliConfig,
    openai: mergeProviderConfig(
      fileConfig.openai,
      mergeProviderConfig(effectiveEnvConfig.openai, cliConfig?.openai),
    ),
    anthropic: mergeProviderConfig(
      fileConfig.anthropic,
      mergeProviderConfig(effectiveEnvConfig.anthropic, cliConfig?.anthropic),
    ),
  };

  return parseConfig(merged);
};

const setTopLevelValue = (
  config: ConfigInput,
  key: ConfigKey,
  value: string,
) => {
  switch (key) {
    case "provider":
      config.provider = parseProvider(value);
      return;
    case "type":
      config.type = parseCommitType(value);
      return;
    case "locale":
      config.locale = parseLocale(value);
      return;
    case "maxLength":
      config.maxLength = parsePositiveInt(value, "maxLength");
      return;
    case "maxDiffChars":
      config.maxDiffChars = parsePositiveInt(value, "maxDiffChars");
      return;
    default:
      return;
  }
};

const setProviderValue = (
  config: ConfigInput,
  provider: AiProvider,
  key: "apiKey" | "model",
  value: string,
) => {
  const providerConfig = config[provider] ?? Object.create(null);
  if (key === "apiKey") {
    providerConfig.apiKey = parseNonEmptyString(value, `${provider}.apiKey`);
  } else {
    providerConfig.model = parseNonEmptyString(value, `${provider}.model`);
  }
  config[provider] = providerConfig;
};

const deleteProviderValue = (
  config: ConfigInput,
  provider: AiProvider,
  key: "apiKey" | "model",
) => {
  const providerConfig = config[provider];
  if (!providerConfig) {
    return;
  }
  if (key === "apiKey") {
    delete providerConfig.apiKey;
  } else {
    delete providerConfig.model;
  }
};

export const setConfigs = async (keyValues: [key: string, value: string][]) => {
  const fileConfig = await readConfigFile();

  for (const [rawKey, value] of keyValues) {
    if (!isConfigKey(rawKey)) {
      throw new KnownError(`Invalid config property: ${rawKey}`);
    }

    if (value === "") {
      if (rawKey.startsWith("openai.") || rawKey.startsWith("anthropic.")) {
        const [provider, nestedKey] = rawKey.split(".") as [
          AiProvider,
          "apiKey" | "model",
        ];
        deleteProviderValue(fileConfig, provider, nestedKey);
      } else {
        delete (fileConfig as Record<string, unknown>)[rawKey];
      }
      continue;
    }

    if (rawKey.startsWith("openai.") || rawKey.startsWith("anthropic.")) {
      const [provider, nestedKey] = rawKey.split(".") as [
        AiProvider,
        "apiKey" | "model",
      ];
      setProviderValue(fileConfig, provider, nestedKey, value);
      continue;
    }

    setTopLevelValue(fileConfig, rawKey as ConfigKey, value);
  }

  parseConfig(fileConfig);

  const configPath = getConfigPath();
  const tempPath = `${configPath}.${process.pid}.tmp`;
  await fs.writeFile(
    tempPath,
    `${JSON.stringify(fileConfig, null, 2)}\n`,
    "utf8",
  );
  await fs.rename(tempPath, configPath);
};
