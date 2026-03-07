import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { fileExists } from "./fs.js";
import { KnownError } from "./error.js";
import {
  CONFIG_KEYS,
  DEFAULT_CONFIG,
  PROVIDER_IDS,
  isProviderAliasKey,
  toProviderConfigKey,
  type AiProvider,
  type Config,
  type ConfigInput,
  isConfigKey,
} from "./config-types.js";
import { getProviderDefaultCommand, getProviderDefaultModel } from "./providers.js";

export const getConfigPath = () => path.join(os.homedir(), ".aidescribe.json");

const LEGACY_PROVIDER_IDS = ["openai", "anthropic", "mistral"] as const;
const LEGACY_PROVIDER_CONFIG_KEYS = LEGACY_PROVIDER_IDS.flatMap((provider) => [
  `providers.${provider}.apiKey`,
  `providers.${provider}.model`,
  `providers.${provider}.baseURL`,
]);
const LEGACY_CONFIG_KEYS = new Set<string>(LEGACY_PROVIDER_CONFIG_KEYS);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyTrimmedString = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1));

const providerSchemaShape = Object.fromEntries(
  PROVIDER_IDS.flatMap((provider) => [
    [`providers.${provider}.model`, nonEmptyTrimmedString.optional()],
    [`providers.${provider}.agent`, nonEmptyTrimmedString.optional()],
    [`providers.${provider}.command`, nonEmptyTrimmedString.optional()],
  ]),
);

const configSchema = z.object({
  provider: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.enum(PROVIDER_IDS))
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
  ...providerSchemaShape,
});

const parseConfig = (input: ConfigInput): Config => {
  const sanitizedInput: ConfigInput = { ...input };
  if (typeof sanitizedInput.provider === "string") {
    const normalizedProvider = sanitizedInput.provider.trim().toLowerCase();
    if (!PROVIDER_IDS.includes(normalizedProvider as AiProvider)) {
      delete sanitizedInput.provider;
    }
  }

  const lenient = configSchema.safeParse(sanitizedInput);
  const parsed = lenient.success ? lenient.data : {};
  const parsedRecord = parsed as Record<string, unknown>;

  const providerConfig = Object.fromEntries(
    PROVIDER_IDS.flatMap((provider) => {
      const modelKey = `providers.${provider}.model`;
      const commandKey = `providers.${provider}.command`;
      const defaultModel = getProviderDefaultModel(provider);

      return [
        [modelKey, parsedRecord[modelKey] ?? defaultModel],
        [`providers.${provider}.agent`, parsedRecord[`providers.${provider}.agent`]],
        [commandKey, parsedRecord[commandKey] ?? getProviderDefaultCommand(provider)],
      ];
    }),
  );

  return {
    provider: parsed.provider ?? DEFAULT_CONFIG.provider,
    locale: parsed.locale ?? DEFAULT_CONFIG.locale,
    type: parsed.type ?? DEFAULT_CONFIG.type,
    maxLength: parsed.maxLength ?? DEFAULT_CONFIG.maxLength,
    maxDiffChars: parsed.maxDiffChars ?? DEFAULT_CONFIG.maxDiffChars,
    ...(providerConfig as Omit<
      Config,
      "provider" | "locale" | "type" | "maxLength" | "maxDiffChars"
    >),
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
      if (!isConfigKey(key) && !LEGACY_CONFIG_KEYS.has(key)) {
        throw new KnownError(
          `Invalid config key "${key}" in ${configPath}. Supported keys: ${CONFIG_KEYS.join(", ")}.`,
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

  // remove undefined values from cliConfig to allow fileConfig to take precedence
  const cliConfig = options?.cliConfig
    ? Object.fromEntries(
        Object.entries(options.cliConfig).filter(([_, value]) => value !== undefined),
      )
    : {};

  const merged: ConfigInput = {
    ...fileConfig,
    ...cliConfig,
  };

  return parseConfig(merged);
};

export type CliConfigOverrides = {
  aiProvider?: string;
  aiLocale?: string;
  aiType?: string;
  aiMaxLength?: number;
  aiMaxDiffChars?: number;
};

const validateConfig = (config: Record<string, unknown>) => {
  const result = configSchema.safeParse(config);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "config";
    throw new KnownError(`Invalid ${path}: ${issue?.message}`);
  }
};

const resolveSetKey = (key: string, activeProvider: AiProvider) => {
  if (isConfigKey(key)) {
    return key;
  }

  if (isProviderAliasKey(key)) {
    return toProviderConfigKey(activeProvider, key);
  }

  return null;
};

const normalizeProvider = (value: unknown): AiProvider | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return PROVIDER_IDS.includes(normalized as AiProvider) ? (normalized as AiProvider) : null;
};

const normalizeConfigValue = (key: string, value: string) => {
  if (
    key === "provider" ||
    key.endsWith(".model") ||
    key.endsWith(".agent") ||
    key.endsWith(".command")
  ) {
    return value.trim();
  }

  return value;
};

export const setConfigs = async (keyValues: [key: string, value: string][]) => {
  const fileConfig: Record<string, unknown> = await readConfigFile();
  let activeProvider = parseConfig(fileConfig as ConfigInput).provider;

  for (const [key, value] of keyValues) {
    const resolvedKey = resolveSetKey(key, activeProvider);
    if (!resolvedKey) {
      throw new KnownError(`Invalid config property: ${key}`);
    }

    const normalizedValue = normalizeConfigValue(resolvedKey, value);

    if (normalizedValue === "") {
      delete fileConfig[resolvedKey];
    } else {
      fileConfig[resolvedKey] = normalizedValue;
    }

    if (resolvedKey === "provider") {
      const nextProvider = normalizeProvider(normalizedValue);
      activeProvider = nextProvider ?? parseConfig(fileConfig as ConfigInput).provider;
    }
  }

  validateConfig(fileConfig);

  const configPath = getConfigPath();
  const tempPath = `${configPath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(fileConfig, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, configPath);
};
