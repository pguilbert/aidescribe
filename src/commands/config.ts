import { command } from "cleye";
import { hasOwn } from "../utils/config-types.js";
import {
  getConfig,
  getConfigPath,
  setConfigs,
} from "../utils/config-runtime.js";
import { KnownError, handleCommandError } from "../utils/error.js";

const sensitiveKeys = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"];

const maskValue = (key: string, value: unknown) => {
  if (!sensitiveKeys.includes(key)) {
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
      const params = argv._ as unknown as {
        mode?: string;
        keyValues?: string[];
      };
      const mode = params.mode;
      const keyValues = params.keyValues ?? [];

      if (!mode) {
        const config = await getConfig({}, {}, true);
        console.log(`Config file: ${getConfigPath()}`);
        console.log(`AI_PROVIDER=${config.AI_PROVIDER}`);
        console.log(`OPENAI_API_KEY=${maskValue("OPENAI_API_KEY", config.OPENAI_API_KEY ?? "")}`);
        console.log(
          `ANTHROPIC_API_KEY=${maskValue("ANTHROPIC_API_KEY", config.ANTHROPIC_API_KEY ?? "")}`,
        );
        console.log(`OPENAI_MODEL=${config.OPENAI_MODEL}`);
        console.log(`ANTHROPIC_MODEL=${config.ANTHROPIC_MODEL}`);
        console.log(`locale=${config.locale}`);
        console.log(`type=${config.type}`);
        console.log(`max-length=${config["max-length"]}`);
        console.log(`max-diff-chars=${config["max-diff-chars"]}`);
        return;
      }

      if (mode === "get") {
        const config = await getConfig({}, {}, true);
        for (const key of keyValues) {
          if (!hasOwn(config, key)) {
            continue;
          }
          const value = config[key as keyof typeof config];
          console.log(`${key}=${maskValue(key, value ?? "")}`);
        }
        return;
      }

      if (mode === "set") {
        const parsedPairs = keyValues.map((keyValue) => {
          const separator = keyValue.indexOf("=");
          if (separator < 0) {
            throw new KnownError(
              `Invalid key=value pair: ${keyValue}. Use: aidescribe config set key=value`,
            );
          }

          const key = keyValue.slice(0, separator);
          const value = keyValue.slice(separator + 1);
          return [key, value] as [string, string];
        });

        await setConfigs(parsedPairs);
        return;
      }

      throw new KnownError(`Invalid mode: ${mode}. Use "get" or "set".`);
    })().catch(handleCommandError);
  },
);
