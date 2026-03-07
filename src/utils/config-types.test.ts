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
    expect(isConfigKey("providers.opencode.command")).toBe(true);
    expect(isConfigKey("providers.opencode.model")).toBe(true);
    expect(isConfigKey("providers.opencode.agent")).toBe(true);
  });

  it("returns false for invalid keys", () => {
    expect(isConfigKey("invalid")).toBe(false);
    expect(isConfigKey("")).toBe(false);
    expect(isConfigKey("providers.openai.apiKey")).toBe(false);
  });
});

describe("provider key aliases", () => {
  it("identifies supported alias keys", () => {
    expect(isProviderAliasKey("model")).toBe(true);
    expect(isProviderAliasKey("agent")).toBe(true);
    expect(isProviderAliasKey("command")).toBe(true);
    expect(isProviderAliasKey("apiKey")).toBe(false);
  });

  it("maps alias to provider-scoped config key", () => {
    expect(toProviderConfigKey("opencode", "model")).toBe("providers.opencode.model");
  });
});

describe("getActiveProviderConfig", () => {
  it("returns opencode config when provider is opencode", () => {
    const config: Config = {
      provider: "opencode",
      locale: "en",
      type: "conventional",
      maxLength: 72,
      maxDiffChars: 40_000,
      "providers.opencode.command": "opencode",
      "providers.opencode.model": "openai/gpt-5-mini",
      "providers.opencode.agent": "default",
    };

    expect(getActiveProviderConfig(config)).toEqual({
      provider: "opencode",
      command: "opencode",
      model: "openai/gpt-5-mini",
      agent: "default",
    });
  });
});
