import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileExists } from "./fs.js";
import { KnownError } from "./error.js";
import {
  CONFIG_KEYS,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_CONFIG,
  type AiProvider,
  type CommitType,
  type Config,
  type ConfigInput,
  type ConfigKey,
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

const parseConfig = (input: ConfigInput): Config => {
  const provider = parseProvider(input.provider) ?? DEFAULT_CONFIG.provider;
  const model =
    parseNonEmptyString(input.model, "model") ??
    (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_CONFIG.model);
  const apiKey = parseNonEmptyString(input.apiKey, "apiKey");
  const locale = parseLocale(input.locale) ?? DEFAULT_CONFIG.locale;
  const type = parseCommitType(input.type) ?? DEFAULT_CONFIG.type;
  const maxLength =
    parsePositiveInt(input.maxLength, "maxLength") ?? DEFAULT_CONFIG.maxLength;
  const maxDiffChars =
    parsePositiveInt(input.maxDiffChars, "maxDiffChars") ??
    DEFAULT_CONFIG.maxDiffChars;

  return {
    provider,
    apiKey,
    model,
    locale,
    type,
    maxLength,
    maxDiffChars,
  };
};

const getEnvConfig = (): ConfigInput => ({
  provider: process.env.AIDESCRIBE_PROVIDER,
  apiKey: process.env.AIDESCRIBE_API_KEY,
  model: process.env.AIDESCRIBE_MODEL,
  locale: process.env.AIDESCRIBE_LOCALE,
  type: process.env.AIDESCRIBE_TYPE,
  maxLength: process.env.AIDESCRIBE_MAX_LENGTH,
  maxDiffChars: process.env.AIDESCRIBE_MAX_DIFF_CHARS,
});

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

    const rawConfig: ConfigInput = Object.create(null);
    for (const [key, value] of Object.entries(parsed)) {
      if (!isConfigKey(key)) {
        throw new KnownError(
          `Invalid config key "${key}" in ${configPath}. Supported keys: ${CONFIG_KEYS.join(
            ", ",
          )}.`,
        );
      }
      rawConfig[key] = value;
    }

    return rawConfig;
  } catch (error) {
    if (error instanceof KnownError) {
      throw error;
    }
    throw new KnownError(
      `Invalid config file format at ${configPath}. Expected a JSON object.`,
    );
  }
};

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
  };

  return parseConfig(merged);
};

const normalizeConfigValue = (key: ConfigKey, value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new KnownError(`${key} cannot be empty.`);
  }

  switch (key) {
    case "provider":
      return parseProvider(trimmed);
    case "type":
      return parseCommitType(trimmed);
    case "locale":
      return parseLocale(trimmed);
    case "maxLength":
      return parsePositiveInt(trimmed, "maxLength");
    case "maxDiffChars":
      return parsePositiveInt(trimmed, "maxDiffChars");
    case "apiKey":
    case "model":
      return trimmed;
  }
};

export const setConfigs = async (keyValues: [key: string, value: string][]) => {
  const fileConfig = await readConfigFile();

  for (const [key, value] of keyValues) {
    if (!isConfigKey(key)) {
      throw new KnownError(`Invalid config property: ${key}`);
    }

    if (value === "") {
      delete fileConfig[key];
      continue;
    }

    const normalized = normalizeConfigValue(key, value);
    if (normalized === undefined) {
      delete fileConfig[key];
      continue;
    }

    fileConfig[key] = normalized;
  }

  parseConfig(fileConfig);

  await fs.writeFile(
    getConfigPath(),
    `${JSON.stringify(fileConfig, null, 2)}\n`,
    "utf8",
  );
};
