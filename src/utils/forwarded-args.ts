const localFlagsWithValues = new Set([
  "--ai-provider",
  "--ai-locale",
  "--type",
  "-t",
  "--ai-max-length",
  "--ai-max-diff-chars",
]);

const localBooleanFlags = new Set(["--verbose"]);

export const getForwardedJjDescribeArgs = (rawArgv: string[]) => {
  const forwarded: string[] = [];

  for (let index = 0; index < rawArgv.length; index += 1) {
    const token = rawArgv[index];

    if (token === "--") {
      forwarded.push(...rawArgv.slice(index + 1));
      break;
    }

    const equalIndex = token.indexOf("=");
    if (equalIndex > 0) {
      const key = token.slice(0, equalIndex);
      if (localFlagsWithValues.has(key)) {
        continue;
      }
      if (localBooleanFlags.has(key)) {
        continue;
      }
    }

    if (localFlagsWithValues.has(token)) {
      index += 1;
      continue;
    }
    if (localBooleanFlags.has(token)) {
      continue;
    }

    forwarded.push(token);
  }

  return forwarded;
};
