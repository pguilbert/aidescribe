import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "./config-types.js";

const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: generateTextMock,
}));

vi.mock("./providers.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./providers.js")>();
  return {
    ...actual,
    getProviderDefinition: () => ({
      label: "OpenAI",
      defaultModel: "gpt-5-mini",
      defaultBaseURL: "https://api.example.test/v1",
      apiMode: "openai-default",
      createClient: () => (modelId: string) => ({ modelId }),
    }),
  };
});

import { KnownError } from "./error.js";
import { generateDescription } from "./ai.js";

const config: Config = {
  provider: "openai",
  locale: "en",
  type: "conventional",
  maxLength: 72,
  maxDiffChars: 40_000,
  variantCount: 3,
  "providers.openai.apiKey": "sk-openai",
  "providers.openai.model": "gpt-5-mini",
  "providers.anthropic.model": "claude-haiku-4-5",
  "providers.mistral.model": "mistral-small-latest",
};

describe("generateDescription", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });

  it("returns deduped variants", async () => {
    generateTextMock
      .mockResolvedValueOnce({ text: "feat: add count flag", finishReason: "stop", warnings: [] })
      .mockResolvedValueOnce({ text: "feat: add count flag", finishReason: "stop", warnings: [] })
      .mockResolvedValueOnce({
        text: "feat: add variant config",
        finishReason: "stop",
        warnings: [],
      });

    await expect(generateDescription("diff", config)).resolves.toEqual([
      "feat: add count flag",
      "feat: add variant config",
    ]);
    expect(generateTextMock).toHaveBeenCalledTimes(3);
  });

  it("rejects empty responses", async () => {
    generateTextMock.mockResolvedValue({ text: "   ", finishReason: "stop", warnings: [] });

    await expect(
      generateDescription("diff", { ...config, variantCount: 1 }),
    ).rejects.toBeInstanceOf(KnownError);
  });

  it("does not truncate responses longer than maxLength", async () => {
    const longText = "feat: add a much longer description than the configured max length allows";
    generateTextMock.mockResolvedValue({ text: longText, finishReason: "stop", warnings: [] });

    await expect(generateDescription("diff", { ...config, variantCount: 1 })).resolves.toEqual([
      longText,
    ]);
  });
});
