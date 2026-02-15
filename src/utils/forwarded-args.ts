const localFlagsWithValues = new Set([
  "--ai-api-key",
  "--ai-base-url",
  "--ai-model",
  "--ai-locale",
  "--ai-type",
  "--ai-max-length",
  "--ai-max-diff-chars",
]);

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
    }

    if (localFlagsWithValues.has(token)) {
      index += 1;
      continue;
    }

    forwarded.push(token);
  }

  return forwarded;
};
