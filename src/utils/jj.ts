import { execa } from "execa";
import { KnownError } from "./error.js";

type JjTargetOptions = {
  globalArgs?: string[];
  revsets?: string[];
};

const getTargetRevsetExpression = (revsets: string[]) =>
  revsets.length > 0 ? revsets.join("|") : "@";

const buildBaseJjArgs = (globalArgs: string[]) => {
  const args = [...globalArgs];
  if (!globalArgs.includes("--no-pager")) {
    args.push("--no-pager");
  }
  return args;
};

export const assertJjRepo = async () => {
  const result = await execa("jj", ["root"], { reject: false });
  if (result.failed) {
    throw new KnownError("The current directory must be inside a jj repository.");
  }
};

export const getDiff = async (options?: JjTargetOptions) => {
  const globalArgs = options?.globalArgs ?? [];
  const revsets = options?.revsets ?? [];

  const args = buildBaseJjArgs(globalArgs);
  args.push("diff");

  if (revsets.length > 0) {
    args.push("--revisions", getTargetRevsetExpression(revsets));
  }

  const { stdout } = await execa("jj", args);
  return stdout.trim();
};

export const getCurrentDescriptions = async (options?: JjTargetOptions) => {
  const globalArgs = options?.globalArgs ?? [];
  const revsets = options?.revsets ?? [];

  const args = buildBaseJjArgs(globalArgs);
  args.push(
    "log",
    "--no-graph",
    "--revisions",
    getTargetRevsetExpression(revsets),
    "--template",
    'description.first_line() ++ "\\n"',
  );

  const { stdout } = await execa("jj", args);
  const descriptions = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return Array.from(new Set(descriptions));
};

export const runJjDescribe = async (message: string, args: string[]) => {
  await execa("jj", ["describe", "-m", message, ...args], {
    stdio: "inherit",
  });
};
