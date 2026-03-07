import { execa } from "execa";
import { type Config, getActiveProviderConfig } from "./config-types.js";
import { KnownError } from "./error.js";
import { generatePrompt } from "./prompt.js";
import { getProviderDefinition } from "./providers.js";

type GenerateDescriptionOptions = {
  verbose?: boolean;
  currentDescriptions?: string[];
};

type OpencodeJsonLine = {
  type?: string;
  part?: {
    type?: string;
    text?: string;
  };
  error?: {
    message?: string;
  };
  message?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseOpencodeJsonOutput = (stdout: string) => {
  const textParts: string[] = [];
  const warnings: string[] = [];
  let hasJsonLines = false;

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    let parsed: OpencodeJsonLine;
    try {
      parsed = JSON.parse(trimmed) as OpencodeJsonLine;
    } catch {
      continue;
    }

    if (!isRecord(parsed)) {
      continue;
    }

    hasJsonLines = true;

    if (
      parsed.type === "text" &&
      parsed.part?.type === "text" &&
      typeof parsed.part.text === "string"
    ) {
      textParts.push(parsed.part.text);
      continue;
    }

    if (parsed.type === "error") {
      const message = parsed.error?.message ?? parsed.message;
      if (typeof message === "string" && message.trim()) {
        warnings.push(message.trim());
      }
    }
  }

  if (textParts.length > 0) {
    return {
      text: textParts.join("\n").trim(),
      finishReason: "completed",
      warnings,
    };
  }

  if (!hasJsonLines) {
    const fallback = stdout.trim();
    return {
      text: fallback,
      finishReason: fallback ? "completed" : "empty",
      warnings,
    };
  }

  return {
    text: "",
    finishReason: "empty",
    warnings,
  };
};

const printVerbosePayload = (config: Config, systemPrompt: string, prompt: string) => {
  const activeProvider = getActiveProviderConfig(config);
  const providerDetails = getProviderDefinition(config.provider);
  const lines = [
    "[aidescribe] AI request payload",
    `provider=${config.provider}`,
    `command=${activeProvider.command ?? providerDetails.defaultCommand}`,
    `model=${activeProvider.model ?? "<provider default>"}`,
    `agent=${activeProvider.agent ?? "<default>"}`,
    `apiMode=${providerDetails.apiMode}`,
  ];

  lines.push("", "[system]", systemPrompt, "", "[prompt]", prompt, "");
  process.stderr.write(`${lines.join("\n")}\n`);
};

const printVerboseResponse = (rawText: string, finishReason: string, warnings: unknown) => {
  const lines = [
    "[aidescribe] AI response payload",
    `finishReason=${finishReason}`,
    `warnings=${warnings ? JSON.stringify(warnings) : "[]"}`,
    "",
    "[response.text]",
    rawText || "<empty>",
    "",
  ];

  process.stderr.write(`${lines.join("\n")}\n`);
};

const truncateToLength = (message: string, maxLength: number) =>
  message.length > maxLength ? message.slice(0, maxLength).trim() : message;

type ProviderResult = {
  rawText: string;
  finishReason: string;
  warnings: unknown;
  reasoningText: string;
};

const buildOpencodeMessage = (systemPrompt: string, diffForModel: string) =>
  [
    "Use the following instructions to generate a commit title:",
    "",
    systemPrompt,
    "",
    "Git diff:",
    diffForModel,
  ].join("\n");

const generateWithProvider = async (
  diffForModel: string,
  config: Config,
  systemPrompt: string,
): Promise<ProviderResult> => {
  const activeProvider = getActiveProviderConfig(config);
  const provider = getProviderDefinition(config.provider);
  const command = activeProvider.command ?? provider.defaultCommand;
  const args = ["run", "--format", "json"];

  if (activeProvider.model) {
    args.push("--model", activeProvider.model);
  }

  if (activeProvider.agent) {
    args.push("--agent", activeProvider.agent);
  }

  const input = buildOpencodeMessage(systemPrompt, diffForModel);

  let result: Awaited<ReturnType<typeof execa>>;
  try {
    result = await execa(command, args, {
      input,
      reject: false,
    });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") {
      throw new KnownError(
        `Provider command "${command}" was not found. Install OpenCode or set providers.${config.provider}.command to a valid executable path.`,
      );
    }

    throw error;
  }

  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
  const parsedOutput = parseOpencodeJsonOutput(stdout);

  if (result.exitCode !== 0) {
    const detail = (parsedOutput.warnings[0] ?? stderr) || `exit code ${result.exitCode}`;
    throw new KnownError(`Provider command failed: ${detail}`);
  }

  const warningPayload = {
    events: parsedOutput.warnings,
    stderr: stderr || undefined,
  };

  return {
    rawText: parsedOutput.text,
    finishReason: parsedOutput.finishReason,
    warnings: warningPayload,
    reasoningText: "",
  };
};

export const generateDescription = async (
  diff: string,
  config: Config,
  options?: GenerateDescriptionOptions,
) => {
  const activeProvider = getActiveProviderConfig(config);

  const diffForModel =
    diff.length > config.maxDiffChars
      ? `${diff.slice(-config.maxDiffChars)}\n\n[Diff truncated due to size]`
      : diff;

  const systemPrompt = generatePrompt(
    config.locale,
    config.maxLength,
    config.type,
    options?.currentDescriptions ?? [],
  );

  if (options?.verbose) {
    printVerbosePayload(config, systemPrompt, diffForModel);
  }

  let providerResult: ProviderResult;
  try {
    providerResult = await generateWithProvider(diffForModel, config, systemPrompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new KnownError(
      `AI request failed for provider "${config.provider}" (model "${activeProvider.model ?? "<provider default>"}"): ${message}`,
    );
  }

  if (options?.verbose) {
    printVerboseResponse(
      providerResult.rawText,
      providerResult.finishReason,
      providerResult.warnings,
    );
  }

  const message = providerResult.rawText.trim();

  if (!message) {
    throw new KnownError(
      `AI returned an empty description (finishReason=${providerResult.finishReason}). Re-run with --verbose to inspect provider output.`,
    );
  }

  return truncateToLength(message, config.maxLength);
};
