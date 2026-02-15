import { command } from "cleye";
import {
  ConfigKey,
  isConfigKey,
  SENSITIVE_CONFIG_KEYS,
} from "../utils/config-types.js";
import {
  getConfig,
  getConfigPath,
  setConfigs,
} from "../utils/config-runtime.js";
import { KnownError, handleCommandError } from "../utils/error.js";

const maskValue = (key: ConfigKey, value: unknown) => {
  if (!SENSITIVE_CONFIG_KEYS.includes(key)) {
    return String(value);
  }

  const asString = String(value);
  if (!asString) {
    return "";
  }
  return asString.length <= 4
    ? `${asString}****`
    : `${asString.slice(0, 4)}****`;
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
      const keyValues = keyValuesRaw.filter(
        (value): value is string => typeof value === "string",
      );

      if (!mode) {
        const config = await getConfig();
        console.log(`Config file: ${getConfigPath()}`);
        console.log(`provider=${config.provider}`);
        console.log(`apiKey=${maskValue("apiKey", config.apiKey ?? "")}`);
        console.log(`model=${config.model}`);
        console.log(`locale=${config.locale}`);
        console.log(`type=${config.type}`);
        console.log(`maxLength=${config.maxLength}`);
        console.log(`maxDiffChars=${config.maxDiffChars}`);
        return;
      }

      if (mode === "get") {
        const config = await getConfig();
        for (const key of keyValues) {
          if (!isConfigKey(key)) {
            continue;
          }
          const value = config[key];
          console.log(`${key}=${maskValue(key, value ?? "")}`);
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
