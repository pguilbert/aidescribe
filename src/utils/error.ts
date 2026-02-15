export class KnownError extends Error {}

export const handleCommandError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`aidescribe: ${message}\n`);
  process.exit(1);
};
