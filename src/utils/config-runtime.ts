import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { fileExists } from "./fs.js";
import { KnownError } from "./error.js";
import {
  DEFAULT_CONFIG,
  type Config,
  type ConfigInput,
  type ConfigKey,
  isConfigKey,
} from "./config-types.js";

export const getConfigPath = () => path.join(os.homedir(), ".aidescribe.json");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const configSchema = z.object({
  provider: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.enum(["openai", "anthropic"]))
    .optional(),
  locale: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().regex(/^[a-z-]+$/i, 'must match letters and dashes (e.g. "en")'))
    .optional(),
  type: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.enum(["conventional", "plain"]))
    .optional(),
  maxLength: z
    .union([z.number(), z.string().transform((s) => Number(s.trim()))])
    .pipe(z.number().int().positive({ message: "must be a positive integer" }))
    .optional(),
  maxDiffChars: z
    .union([z.number(), z.string().transform((s) => Number(s.trim()))])
    .pipe(z.number().int().positive({ message: "must be a positive integer" }))
    .optional(),
  "openai.apiKey": z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1))
    .optional(),
  "openai.model": z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1))
    .optional(),
  "anthropic.apiKey": z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1))
    .optional(),
  "anthropic.model": z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1))
    .optional(),
});

const parseConfig = (input: ConfigInput): Config => {
  const lenient = configSchema.safeParse(input);
  const parsed = lenient.success ? lenient.data : {};

  return {
    provider: parsed.provider ?? DEFAULT_CONFIG.provider,
    locale: parsed.locale ?? DEFAULT_CONFIG.locale,
    type: parsed.type ?? DEFAULT_CONFIG.type,
    maxLength: parsed.maxLength ?? DEFAULT_CONFIG.maxLength,
    maxDiffChars: parsed.maxDiffChars ?? DEFAULT_CONFIG.maxDiffChars,
    "openai.apiKey": parsed["openai.apiKey"],
    "openai.model": parsed["openai.model"] ?? DEFAULT_CONFIG["openai.model"],
    "anthropic.apiKey": parsed["anthropic.apiKey"],
    "anthropic.model": parsed["anthropic.model"] ?? DEFAULT_CONFIG["anthropic.model"],
  };
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
      throw new KnownError(`Invalid config file format at ${configPath}. Expected a JSON object.`);
    }

    for (const key of Object.keys(parsed)) {
      if (!isConfigKey(key)) {
        throw new KnownError(
          `Invalid config key "${key}" in ${configPath}. Supported keys: ${Object.keys(DEFAULT_CONFIG).join(", ")}.`,
        );
      }
    }

    return parsed as ConfigInput;
  } catch (error) {
    if (error instanceof KnownError) {
      throw error;
    }
    throw new KnownError(`Invalid config file format at ${configPath}. Expected a JSON object.`);
  }
};

type GetConfigOptions = {
  cliConfig?: ConfigInput;
};

export const getConfig = async (options?: GetConfigOptions): Promise<Config> => {
  const fileConfig = await readConfigFile();
  const merged: ConfigInput = { ...fileConfig, ...options?.cliConfig };
  return parseConfig(merged);
};

const validateConfig = (config: Record<string, unknown>) => {
  const result = configSchema.safeParse(config);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "config";
    throw new KnownError(`Invalid ${path}: ${issue?.message}`);
  }
};

export const setConfigs = async (keyValues: [key: string, value: string][]) => {
  const fileConfig: Record<string, unknown> = await readConfigFile();

  for (const [key, value] of keyValues) {
    if (!isConfigKey(key)) {
      throw new KnownError(`Invalid config property: ${key}`);
    }

    if (value === "") {
      delete fileConfig[key];
    } else {
      fileConfig[key] = value;
    }
  }

  validateConfig(fileConfig);

  const configPath = getConfigPath();
  const tempPath = `${configPath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(fileConfig, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, configPath);
};
