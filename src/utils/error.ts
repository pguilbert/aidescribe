export class KnownError extends Error {}

export const handleCommandError = (error: unknown) => {
  if (error instanceof KnownError) {
    process.stderr.write(`aidescribe: ${error.message}\n`);
    process.exit(1);
  }

  if (error instanceof Error) {
    const message = error.stack ?? error.message;
    process.stderr.write(`aidescribe: ${message}\n`);
    process.exit(1);
  }

  process.stderr.write(`aidescribe: ${String(error)}\n`);
  process.exit(1);
};
