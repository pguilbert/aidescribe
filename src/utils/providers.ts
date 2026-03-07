export const PROVIDER_IDS = ["opencode"] as const;
export type AiProvider = (typeof PROVIDER_IDS)[number];

type ProviderDefinition = {
  label: string;
  defaultModel?: string;
  defaultCommand: string;
  apiMode: string;
};

const PROVIDERS: Record<AiProvider, ProviderDefinition> = {
  opencode: {
    label: "OpenCode",
    defaultModel: undefined,
    defaultCommand: "opencode",
    apiMode: "opencode-cli",
  },
} as const;

export const getProviderDefinition = (provider: AiProvider) => PROVIDERS[provider];
export const getProviderDefaultModel = (provider: AiProvider) => PROVIDERS[provider].defaultModel;
export const getProviderDefaultCommand = (provider: AiProvider) =>
  PROVIDERS[provider].defaultCommand;
