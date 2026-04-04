import { describe, expect, it } from "vitest";
import {
  getActiveProviderConfig,
  isConfigKey,
  isProviderAliasKey,
  toProviderConfigKey,
} from "./config-types.js";
import type { Config } from "./config-types.js";

describe("isConfigKey", () => {
  it("returns true for valid config keys", () => {
    expect(isConfigKey("provider")).toBe(true);
    expect(isConfigKey("locale")).toBe(true);
    expect(isConfigKey("variantCount")).toBe(true);
    expect(isConfigKey("providers.openai.apiKey")).toBe(true);
    expect(isConfigKey("providers.anthropic.model")).toBe(true);
    expect(isConfigKey("providers.mistral.baseURL")).toBe(true);
  });

  it("returns false for invalid keys", () => {
    expect(isConfigKey("invalid")).toBe(false);
    expect(isConfigKey("")).toBe(false);
    expect(isConfigKey("providers.openai.invalid")).toBe(false);
  });
});

describe("provider key aliases", () => {
  it("identifies supported alias keys", () => {
    expect(isProviderAliasKey("apiKey")).toBe(true);
    expect(isProviderAliasKey("model")).toBe(true);
    expect(isProviderAliasKey("baseURL")).toBe(true);
    expect(isProviderAliasKey("unknown")).toBe(false);
  });

  it("maps alias to provider-scoped config key", () => {
    expect(toProviderConfigKey("mistral", "apiKey")).toBe("providers.mistral.apiKey");
  });
});

describe("getActiveProviderConfig", () => {
  it("returns openai config when provider is openai", () => {
    const config: Config = {
      provider: "openai",
      locale: "en",
      type: "conventional",
      maxLength: 72,
      maxDiffChars: 40_000,
      variantCount: 1,
      "providers.openai.apiKey": "sk-openai",
      "providers.openai.model": "gpt-5-mini",
      "providers.anthropic.apiKey": "sk-ant",
      "providers.anthropic.model": "claude-3-5-haiku-latest",
      "providers.mistral.apiKey": "sk-mistral",
      "providers.mistral.model": "mistral-small-latest",
    };
    expect(getActiveProviderConfig(config)).toEqual({
      provider: "openai",
      apiKey: "sk-openai",
      model: "gpt-5-mini",
      baseURL: undefined,
    });
  });

  it("returns anthropic config when provider is anthropic", () => {
    const config: Config = {
      provider: "anthropic",
      locale: "en",
      type: "conventional",
      maxLength: 72,
      maxDiffChars: 40_000,
      variantCount: 1,
      "providers.openai.apiKey": "sk-openai",
      "providers.openai.model": "gpt-5-mini",
      "providers.anthropic.apiKey": "sk-ant",
      "providers.anthropic.model": "claude-3-5-haiku-latest",
      "providers.mistral.apiKey": "sk-mistral",
      "providers.mistral.model": "mistral-small-latest",
    };
    expect(getActiveProviderConfig(config)).toEqual({
      provider: "anthropic",
      apiKey: "sk-ant",
      model: "claude-3-5-haiku-latest",
      baseURL: undefined,
    });
  });

  it("returns mistral config when provider is mistral", () => {
    const config: Config = {
      provider: "mistral",
      locale: "en",
      type: "conventional",
      maxLength: 72,
      maxDiffChars: 40_000,
      variantCount: 1,
      "providers.openai.apiKey": "sk-openai",
      "providers.openai.model": "gpt-5-mini",
      "providers.anthropic.apiKey": "sk-ant",
      "providers.anthropic.model": "claude-3-5-haiku-latest",
      "providers.mistral.apiKey": "sk-mistral",
      "providers.mistral.model": "mistral-medium-latest",
      "providers.mistral.baseURL": "https://custom.mistral/v1",
    };
    expect(getActiveProviderConfig(config)).toEqual({
      provider: "mistral",
      apiKey: "sk-mistral",
      model: "mistral-medium-latest",
      baseURL: "https://custom.mistral/v1",
    });
  });
});
