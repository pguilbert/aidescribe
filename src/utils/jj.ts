import { execa } from "execa";
import { KnownError } from "./error.js";

export const assertJjRepo = async () => {
  const result = await execa("jj", ["root"], { reject: false });
  if (result.failed) {
    throw new KnownError("The current directory must be inside a jj repository.");
  }
};

export const getDiff = async () => {
  const { stdout } = await execa("jj", ["--no-pager", "diff"]);
  return stdout.trim();
};

export const runJjDescribe = async (message: string, args: string[]) => {
  await execa("jj", ["describe", "-m", message, ...args], {
    stdio: "inherit",
  });
};
