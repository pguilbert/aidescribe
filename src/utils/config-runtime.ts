import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileExists } from "./fs.js";
import { KnownError } from "./error.js";
import {
  configParsers,
  hasOwn,
  type ConfigKeys,
  type RawConfig,
  type ValidConfig,
} from "./config-types.js";

export const getConfigPath = () => path.join(os.homedir(), ".aidescribe");

const getEnvConfig = (): RawConfig => ({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
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
    const parsed = JSON.parse(configString) as Record<string, unknown>;
    const rawConfig: RawConfig = Object.create(null);

    for (const [key, value] of Object.entries(parsed)) {
      if (!hasOwn(configParsers, key)) {
        continue;
      }
      rawConfig[key as ConfigKeys] = value == null ? undefined : String(value);
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

  const parsedConfig: Record<string, unknown> = {};

  for (const key of Object.keys(configParsers) as ConfigKeys[]) {
    const parser = configParsers[key];
    const value = cliConfig?.[key] ?? effectiveEnvConfig[key] ?? fileConfig[key];

    if (suppressErrors) {
      try {
        parsedConfig[key] = parser(value);
      } catch {}
      continue;
    }

    parsedConfig[key] = parser(value);
  }

  return {
    ...(parsedConfig as Omit<ValidConfig, "model">),
    model: String(parsedConfig.OPENAI_MODEL),
  };
};

export const setConfigs = async (keyValues: [key: string, value: string][]) => {
  const fileConfig = await readConfigFile();

  for (const [key, value] of keyValues) {
    if (!hasOwn(configParsers, key)) {
      throw new KnownError(`Invalid config property: ${key}`);
    }

    if (value === "") {
      delete fileConfig[key as ConfigKeys];
      continue;
    }

    configParsers[key as ConfigKeys](value);
    fileConfig[key as ConfigKeys] = value;
  }

  await fs.writeFile(
    getConfigPath(),
    `${JSON.stringify(fileConfig, null, 2)}\n`,
    "utf8",
  );
};
