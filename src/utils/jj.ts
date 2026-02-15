import { execa } from "execa";
import { KnownError } from "./error.js";

export const assertJjRepo = async () => {
  const result = await execa("jj", ["root"], { reject: false });
  if (result.failed) {
    throw new KnownError("The current directory must be inside a jj repository.");
  }
};

export const getDiff = async (options?: {
  globalArgs?: string[];
  revsets?: string[];
}) => {
  const globalArgs = options?.globalArgs ?? [];
  const revsets = options?.revsets ?? [];

  const args = [...globalArgs];
  if (!globalArgs.includes("--no-pager")) {
    args.push("--no-pager");
  }
  args.push("diff");

  if (revsets.length > 0) {
    args.push("--revisions", revsets.join("|"));
  }

  const { stdout } = await execa("jj", args);
  return stdout.trim();
};

export const runJjDescribe = async (message: string, args: string[]) => {
  await execa("jj", ["describe", "-m", message, ...args], {
    stdio: "inherit",
  });
};
