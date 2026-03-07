import { cancel, intro, isCancel, outro, text, select } from "@clack/prompts";
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
        hint: definition.defaultCommand,
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

  const commandInput = await text({
    message: "Provider command",
    placeholder: providerDefinition.defaultCommand,
    initialValue: existingProviderConfig.command ?? providerDefinition.defaultCommand,
    validate: (value) => validateRequired(value, "Provider command"),
  });

  if (isCancel(commandInput)) {
    cancel("Cancelled");
    return false;
  }

  const modelInput = await text({
    message: "Model (optional)",
    placeholder: "provider default",
    initialValue: existingProviderConfig.model,
  });

  if (isCancel(modelInput)) {
    cancel("Cancelled");
    return false;
  }

  const agentInput = await text({
    message: "Agent (optional)",
    placeholder: "default",
    initialValue: existingProviderConfig.agent,
  });

  if (isCancel(agentInput)) {
    cancel("Cancelled");
    return false;
  }

  const commandValue = toTrimmedPromptValue(commandInput);
  const modelValue = toTrimmedPromptValue(modelInput);
  const agentValue = toTrimmedPromptValue(agentInput);

  if (!commandValue) {
    throw new KnownError("Provider command is required.");
  }

  const keyValues: [string, string][] = [["provider", provider]];

  if (commandValue !== (existingProviderConfig.command ?? providerDefinition.defaultCommand)) {
    keyValues.push([`providers.${provider}.command`, commandValue]);
  }

  if (modelValue !== (existingProviderConfig.model ?? "")) {
    keyValues.push([`providers.${provider}.model`, modelValue]);
  }

  if (agentValue !== (existingProviderConfig.agent ?? "")) {
    keyValues.push([`providers.${provider}.agent`, agentValue]);
  }

  await setConfigs(keyValues);

  outro(`Connected ${providerDefinition.label}. Model: ${modelValue || "provider default"}`);
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
