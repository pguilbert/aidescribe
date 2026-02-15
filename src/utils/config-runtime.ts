import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileExists } from "./fs.js";
import { KnownError } from "./error.js";
import {
  configParsers,
  hasOwn,
  type AiProvider,
  type ConfigKeys,
  type RawConfig,
  type ValidConfig,
} from "./config-types.js";

export const getConfigPath = () => path.join(os.homedir(), ".aidescribe");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getEnvConfig = (): RawConfig => ({
  AI_PROVIDER: process.env.AI_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  locale: process.env.AIDESCRIBE_LOCALE,
  type: process.env.AIDESCRIBE_TYPE,
  "max-length": process.env.AIDESCRIBE_MAX_LENGTH,
  "max-diff-chars": process.env.AIDESCRIBE_MAX_DIFF_CHARS,
});

const readConfigFile = async (): Promise<RawConfig> => {
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
        `Invalid config file format at ${configPath}. Delete it or fix the JSON content.`,
      );
    }
    const rawConfig: RawConfig = Object.create(null);

    for (const [key, value] of Object.entries(parsed)) {
      if (!hasOwn(configParsers, key)) {
        continue;
      }
      rawConfig[key] = value == null ? undefined : String(value);
    }

    return rawConfig;
  } catch {
    throw new KnownError(
      `Invalid config file format at ${configPath}. Delete it or fix the JSON content.`,
    );
  }
};

export const getConfig = async (
  cliConfig?: RawConfig,
  envConfig?: RawConfig,
  suppressErrors?: boolean,
): Promise<ValidConfig> => {
  const fileConfig = await readConfigFile();
  const effectiveEnvConfig = envConfig ?? getEnvConfig();

  type ParsedConfig = Omit<ValidConfig, "provider" | "apiKey" | "model">;
  const getValue = (key: ConfigKeys) =>
    cliConfig?.[key] ?? effectiveEnvConfig[key] ?? fileConfig[key];
  const parseValue = <Key extends ConfigKeys>(
    key: Key,
  ): ReturnType<(typeof configParsers)[Key]> => {
    const parser = configParsers[key];
    const value = getValue(key);

    if (!suppressErrors) {
      return parser(value);
    }

    try {
      return parser(value);
    } catch {
      return parser(undefined);
    }
  };

  const parsedConfig: ParsedConfig = {
    AI_PROVIDER: parseValue("AI_PROVIDER"),
    OPENAI_API_KEY: parseValue("OPENAI_API_KEY"),
    ANTHROPIC_API_KEY: parseValue("ANTHROPIC_API_KEY"),
    OPENAI_MODEL: parseValue("OPENAI_MODEL"),
    ANTHROPIC_MODEL: parseValue("ANTHROPIC_MODEL"),
    locale: parseValue("locale"),
    type: parseValue("type"),
    "max-length": parseValue("max-length"),
    "max-diff-chars": parseValue("max-diff-chars"),
  };

  const provider: AiProvider =
    parsedConfig.AI_PROVIDER === "anthropic" ? "anthropic" : "openai";
  const model =
    provider === "anthropic"
      ? parsedConfig.ANTHROPIC_MODEL
      : parsedConfig.OPENAI_MODEL;
  const apiKey =
    provider === "anthropic"
      ? parsedConfig.ANTHROPIC_API_KEY
      : parsedConfig.OPENAI_API_KEY;

  return {
    ...parsedConfig,
    provider,
    apiKey,
    model,
  };
};

export const setConfigs = async (keyValues: [key: string, value: string][]) => {
  const fileConfig = await readConfigFile();

  for (const [key, value] of keyValues) {
    if (!hasOwn(configParsers, key)) {
      throw new KnownError(`Invalid config property: ${key}`);
    }

    if (value === "") {
      delete fileConfig[key];
      continue;
    }

    configParsers[key](value);
    fileConfig[key] = value;
  }

  await fs.writeFile(
    getConfigPath(),
    `${JSON.stringify(fileConfig, null, 2)}\n`,
    "utf8",
  );
};
