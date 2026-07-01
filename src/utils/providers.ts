import { createAnthropic } from "@ai-sdk/anthropic";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const PROVIDER_IDS = ["openai", "anthropic", "mistral", "openrouter"] as const;
export type AiProvider = (typeof PROVIDER_IDS)[number];

type ProviderClientOptions = {
  apiKey?: string;
  baseURL?: string;
};

type ProviderDefinition = {
  label: string;
  defaultModel: string;
  defaultBaseURL: string;
  apiMode: string;
  createClient: (options: ProviderClientOptions) => (modelId: string) => any;
};

const PROVIDERS: Record<AiProvider, ProviderDefinition> = {
  openai: {
    label: "OpenAI",
    defaultModel: "gpt-5-mini",
    defaultBaseURL: "https://api.openai.com/v1",
    apiMode: "openai-default",
    createClient: ({ apiKey, baseURL }) => createOpenAI({ apiKey, baseURL }),
  },
  anthropic: {
    label: "Anthropic",
    defaultModel: "claude-haiku-4-5",
    defaultBaseURL: "https://api.anthropic.com/v1",
    apiMode: "anthropic-messages",
    createClient: ({ apiKey, baseURL }) => createAnthropic({ apiKey, baseURL }),
  },
  mistral: {
    label: "Mistral",
    defaultModel: "mistral-small-latest",
    defaultBaseURL: "https://api.mistral.ai/v1",
    apiMode: "mistral-chat",
    createClient: ({ apiKey, baseURL }) => createMistral({ apiKey, baseURL }),
  },
  openrouter: {
    label: "OpenRouter",
    defaultModel: "openai/gpt-5-mini",
    defaultBaseURL: "https://openrouter.ai/api/v1",
    apiMode: "openrouter-native",
    createClient: ({ apiKey, baseURL }) =>
      createOpenRouter({
        apiKey,
        baseURL: baseURL ?? "https://openrouter.ai/api/v1",
      }),
  },
} as const;

export const getProviderDefinition = (provider: AiProvider) => PROVIDERS[provider];
export const getProviderDefaultModel = (provider: AiProvider) => PROVIDERS[provider].defaultModel;
