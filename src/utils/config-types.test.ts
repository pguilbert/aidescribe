import { describe, expect, it } from "vitest";
import { getActiveProviderConfig, isConfigKey } from "./config-types.js";
import type { Config } from "./config-types.js";

describe("isConfigKey", () => {
	it("returns true for valid config keys", () => {
		expect(isConfigKey("provider")).toBe(true);
		expect(isConfigKey("locale")).toBe(true);
		expect(isConfigKey("openai.apiKey")).toBe(true);
		expect(isConfigKey("anthropic.model")).toBe(true);
	});

	it("returns false for invalid keys", () => {
		expect(isConfigKey("invalid")).toBe(false);
		expect(isConfigKey("")).toBe(false);
		expect(isConfigKey("openai.invalid")).toBe(false);
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
			"openai.apiKey": "sk-openai",
			"openai.model": "gpt-5-mini",
			"anthropic.apiKey": "sk-ant",
			"anthropic.model": "claude-3-5-haiku-latest",
		};
		expect(getActiveProviderConfig(config)).toEqual({
			apiKey: "sk-openai",
			model: "gpt-5-mini",
		});
	});

	it("returns anthropic config when provider is anthropic", () => {
		const config: Config = {
			provider: "anthropic",
			locale: "en",
			type: "conventional",
			maxLength: 72,
			maxDiffChars: 40_000,
			"openai.apiKey": "sk-openai",
			"openai.model": "gpt-5-mini",
			"anthropic.apiKey": "sk-ant",
			"anthropic.model": "claude-3-5-haiku-latest",
		};
		expect(getActiveProviderConfig(config)).toEqual({
			apiKey: "sk-ant",
			model: "claude-3-5-haiku-latest",
		});
	});
});
