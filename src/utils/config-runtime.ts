import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { fileExists } from "./fs.js";
import { KnownError } from "./error.js";
import {
  TOP_LEVEL_CONFIG_KEYS,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_CONFIG,
  type AiProvider,
  type Config,
  type ConfigInput,
  type ConfigKey,
  type ProviderConfig,
  isConfigKey,
} from "./config-types.js";

export const getConfigPath = () => path.join(os.homedir(), ".aidescribe.json");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1))
  .optional()
  .catch(undefined);

const providerSchema = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.enum(["openai", "anthropic"]))
  .optional()
  .catch(undefined);

const commitTypeSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.enum(["conventional", "plain"]))
  .optional()
  .catch(undefined);

const localeSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().regex(/^[a-z-]+$/i, 'locale must match letters and dashes (e.g. "en")'))
  .optional()
  .catch(undefined);

const positiveInt = z
  .union([z.number(), z.string().transform((s) => Number(s.trim()))])
  .pipe(z.number().int().positive())
  .optional()
  .catch(undefined);

const providerConfigSchema = z.object({
  apiKey: nonEmptyString,
  model: nonEmptyString,
}).optional();

// Strict schemas for setters - throw on invalid input instead of returning undefined
const strictProvider = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.enum(["openai", "anthropic"], { message: 'provider must be "openai" or "anthropic"' }));

const strictCommitType = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.enum(["conventional", "plain"], { message: 'type must be "conventional" or "plain"' }));

const strictLocale = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().regex(/^[a-z-]+$/i, 'locale must match letters and dashes (e.g. "en")'));

const strictPositiveInt = (name: string) =>
  z.string().transform((s) => {
    const n = Number(s.trim());
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`${name} must be a positive integer`);
    }
    return n;
  });

const strictNonEmptyString = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1));

const parseProviderConfig = (
  input: ProviderConfig | undefined,
  provider: AiProvider,
) => {
  const parsed = providerConfigSchema.parse(input);
  return {
    apiKey: parsed?.apiKey,
    model: parsed?.model ?? (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OPENAI_MODEL),
  };
};

const parseConfig = (input: ConfigInput): Config => {
  const provider = providerSchema.parse(input.provider) ?? DEFAULT_CONFIG.provider;
  const locale = localeSchema.parse(input.locale) ?? DEFAULT_CONFIG.locale;
  const type = commitTypeSchema.parse(input.type) ?? DEFAULT_CONFIG.type;
  const maxLength = positiveInt.parse(input.maxLength) ?? DEFAULT_CONFIG.maxLength;
  const maxDiffChars = positiveInt.parse(input.maxDiffChars) ?? DEFAULT_CONFIG.maxDiffChars;

  return {
    provider,
    locale,
    type,
    maxLength,
    maxDiffChars,
    openai: parseProviderConfig(input.openai, "openai"),
    anthropic: parseProviderConfig(input.anthropic, "anthropic"),
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
  const rawConfig: ConfigInput = {};

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
      const providerConfig: ProviderConfig = {};
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
    return {};
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
  ...(base ?? {}),
  ...(override ?? {}),
});

type GetConfigOptions = {
  cliConfig?: ConfigInput;
  envConfig?: ConfigInput;
  providerOverrides?: ProviderConfig;
};

export const getConfig = async (options?: GetConfigOptions): Promise<Config> => {
  const { cliConfig, envConfig, providerOverrides } = options ?? {};
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

  if (providerOverrides) {
    const provider = providerSchema.parse(merged.provider) ?? DEFAULT_CONFIG.provider;
    merged[provider] = mergeProviderConfig(merged[provider], providerOverrides);
  }

  return parseConfig(merged);
};

const setTopLevelValue = (
  config: ConfigInput,
  key: ConfigKey,
  value: string,
) => {
  try {
    switch (key) {
      case "provider":
        config.provider = strictProvider.parse(value);
        return;
      case "type":
        config.type = strictCommitType.parse(value);
        return;
      case "locale":
        config.locale = strictLocale.parse(value);
        return;
      case "maxLength":
        config.maxLength = strictPositiveInt("maxLength").parse(value);
        return;
      case "maxDiffChars":
        config.maxDiffChars = strictPositiveInt("maxDiffChars").parse(value);
        return;
      default:
        return;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new KnownError(error.issues[0]?.message ?? "Invalid value");
    }
    throw error instanceof Error ? new KnownError(error.message) : error;
  }
};

const setProviderValue = (
  config: ConfigInput,
  provider: AiProvider,
  key: "apiKey" | "model",
  value: string,
) => {
  const providerConfig = config[provider] ?? {};
  try {
    providerConfig[key] = strictNonEmptyString.parse(value);
  } catch {
    throw new KnownError(`${provider}.${key} must be a non-empty string`);
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
