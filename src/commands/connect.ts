import { cancel, intro, isCancel, outro, password, text, select } from "@clack/prompts";
import { command } from "cleye";
import { type AiProvider, PROVIDER_IDS, getProviderConfig } from "../utils/config-types.js";
import { getConfig, setConfigs } from "../utils/config-runtime.js";
import { KnownError, handleCommandError } from "../utils/error.js";
import { getProviderDefinition } from "../utils/providers.js";

const validateRequired = (value: string | undefined, field: string) => {
  if (!value || !value.trim()) {
    return `${field} is required`;
  }
  return undefined;
};

const toTrimmedPromptValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const runConnectWizard = async () => {
  const currentConfig = await getConfig();

  const providerChoice = await select({
    message: "Select provider",
    options: PROVIDER_IDS.map((provider) => {
      const definition = getProviderDefinition(provider);
      return {
        value: provider,
        label: definition.label,
        hint: definition.defaultModel,
      };
    }),
  });

  if (isCancel(providerChoice)) {
    cancel("Cancelled");
    return false;
  }

  const provider = providerChoice as AiProvider;
  const providerDefinition = getProviderDefinition(provider);
  const existingProviderConfig = getProviderConfig(currentConfig, provider);
  const hasExistingApiKey = Boolean(existingProviderConfig.apiKey);
  const existingModel = existingProviderConfig.model;

  const apiKeyInput = await password({
    message: hasExistingApiKey
      ? `Enter ${providerDefinition.label} API key (press enter to keep existing)`
      : `Enter ${providerDefinition.label} API key`,
    validate: (value) => {
      if (hasExistingApiKey && !value?.trim()) {
        return undefined;
      }
      return validateRequired(value, "API key");
    },
  });

  if (isCancel(apiKeyInput)) {
    cancel("Cancelled");
    return false;
  }

  const modelInput = await text({
    message: "Model",
    placeholder: providerDefinition.defaultModel,
    initialValue: existingModel,
    validate: (value) => validateRequired(value, "Model"),
  });

  if (isCancel(modelInput)) {
    cancel("Cancelled");
    return false;
  }

  const apiKey = toTrimmedPromptValue(apiKeyInput);
  const model = toTrimmedPromptValue(modelInput);

  if (!apiKey && !hasExistingApiKey) {
    throw new KnownError("API key is required for first-time provider setup.");
  }

  if (!model) {
    throw new KnownError("Model is required.");
  }

  const keyValues: [string, string][] = [["provider", provider]];

  if (apiKey) {
    keyValues.push([`providers.${provider}.apiKey`, apiKey]);
  }

  if (model !== existingModel) {
    keyValues.push([`providers.${provider}.model`, model]);
  }

  await setConfigs(keyValues);

  outro(`Connected ${providerDefinition.label}. Active model: ${model}`);
  return true;
};

export default command(
  {
    name: "connect",
    description: "Interactive provider setup wizard",
    help: {
      description: "Interactive provider setup wizard",
    },
  },
  () => {
    intro("aidescribe connect");

    runConnectWizard().catch(handleCommandError);
  },
);
