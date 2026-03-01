import { command } from "cleye";
import {
  type AiProvider,
  type Config,
  type ConfigKey,
  PROVIDER_IDS,
  isProviderAliasKey,
  isConfigKey,
  SENSITIVE_CONFIG_KEYS,
  toProviderConfigKey,
} from "../utils/config-types.js";
import { getConfig, getConfigPath, setConfigs } from "../utils/config-runtime.js";
import { KnownError, handleCommandError } from "../utils/error.js";

const maskValue = (key: ConfigKey, value: unknown) => {
  if (!SENSITIVE_CONFIG_KEYS.includes(key)) {
    return String(value);
  }

  const asString = String(value);
  if (!asString) {
    return "";
  }
  return asString.length <= 4 ? `${asString}****` : `${asString.slice(0, 4)}****`;
};

const providerOutputKeys = PROVIDER_IDS.flatMap(
  (provider) =>
    [
      `providers.${provider}.apiKey`,
      `providers.${provider}.model`,
      `providers.${provider}.baseURL`,
    ] as ConfigKey[],
);

const CONFIG_OUTPUT_KEYS: ConfigKey[] = [
  "provider",
  ...providerOutputKeys,
  "locale",
  "type",
  "maxLength",
  "maxDiffChars",
];

const getConfigValue = (config: Config, key: ConfigKey) => config[key];

const printConfigEntry = (config: Config, key: ConfigKey, displayKey: string = key) => {
  const value = getConfigValue(config, key);
  console.log(`${displayKey}=${maskValue(key, value ?? "")}`);
};

const resolveRequestedKey = (key: string, activeProvider: AiProvider): ConfigKey | null => {
  if (isConfigKey(key)) {
    return key;
  }

  if (isProviderAliasKey(key)) {
    return toProviderConfigKey(activeProvider, key);
  }

  return null;
};

export default command(
  {
    name: "config",
    description: "View or modify configuration settings",
    help: {
      description: "View or modify configuration settings",
    },
    parameters: ["[mode]", "[keyValues...]"],
  },
  (argv) => {
    (async () => {
      const positional = Array.isArray(argv._) ? argv._ : [];
      const [modeRaw, ...keyValuesRaw] = positional;
      const mode = typeof modeRaw === "string" ? modeRaw : undefined;
      const keyValues = keyValuesRaw.filter((value): value is string => typeof value === "string");

      if (!mode) {
        const config = await getConfig();
        console.log(`Config file: ${getConfigPath()}`);
        for (const key of CONFIG_OUTPUT_KEYS) {
          printConfigEntry(config, key);
        }
        return;
      }

      if (mode === "get") {
        const config = await getConfig();
        for (const key of keyValues) {
          const resolvedKey = resolveRequestedKey(key, config.provider);
          if (!resolvedKey) {
            continue;
          }
          printConfigEntry(config, resolvedKey, key);
        }
        return;
      }

      if (mode === "set") {
        const parsedPairs = keyValues.map((keyValue): [string, string] => {
          const separator = keyValue.indexOf("=");
          if (separator < 0) {
            throw new KnownError(
              `Invalid key=value pair: ${keyValue}. Use: aidescribe config set key=value`,
            );
          }

          const key = keyValue.slice(0, separator);
          const value = keyValue.slice(separator + 1);
          return [key, value];
        });

        await setConfigs(parsedPairs);
        return;
      }

      throw new KnownError(`Invalid mode: ${mode}. Use "get" or "set".`);
    })().catch(handleCommandError);
  },
);
