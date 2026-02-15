type DescribeArgsForDiff = {
  globalArgs: string[];
  revsets: string[];
};

const globalFlagsWithValue = new Set([
  "-R",
  "--repository",
  "--at-operation",
  "--at-op",
  "--color",
  "--config",
  "--config-file",
]);

const globalBooleanFlags = new Set([
  "--ignore-working-copy",
  "--ignore-immutable",
  "--debug",
  "--quiet",
  "--no-pager",
]);

const describeFlagsWithValue = new Set(["-m", "--message"]);
const describeBooleanFlags = new Set(["--stdin", "--editor"]);
const revsetAliasFlags = new Set(["-r", "--revision", "--revisions", "--revsets"]);

const splitLongFlagWithEquals = (token: string) => {
  const separator = token.indexOf("=");
  if (separator < 0) {
    return null;
  }

  return {
    key: token.slice(0, separator),
    value: token.slice(separator + 1),
  };
};

export const parseDescribeArgsForDiff = (args: string[]): DescribeArgsForDiff => {
  const globalArgs: string[] = [];
  const revsets: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--") {
      revsets.push(...args.slice(index + 1));
      break;
    }

    if (token.startsWith("--")) {
      const longWithEquals = splitLongFlagWithEquals(token);
      if (longWithEquals) {
        const { key, value } = longWithEquals;
        if (revsetAliasFlags.has(key)) {
          if (value) {
            revsets.push(value);
          }
          continue;
        }
        if (globalFlagsWithValue.has(key)) {
          globalArgs.push(token);
          continue;
        }
        if (globalBooleanFlags.has(key)) {
          globalArgs.push(key);
        }
        continue;
      }

      if (revsetAliasFlags.has(token)) {
        const value = args[index + 1];
        if (value) {
          revsets.push(value);
          index += 1;
        }
        continue;
      }

      if (globalFlagsWithValue.has(token)) {
        const value = args[index + 1];
        if (value) {
          globalArgs.push(token, value);
          index += 1;
        }
        continue;
      }

      if (globalBooleanFlags.has(token)) {
        globalArgs.push(token);
        continue;
      }

      if (describeFlagsWithValue.has(token)) {
        index += 1;
        continue;
      }

      if (describeBooleanFlags.has(token)) {
        continue;
      }

      continue;
    }

    if (token.startsWith("-") && token !== "-") {
      if (token === "-r") {
        const value = args[index + 1];
        if (value) {
          revsets.push(value);
          index += 1;
        }
        continue;
      }

      if (token.startsWith("-r") && token.length > 2) {
        revsets.push(token.slice(2));
        continue;
      }

      if (token === "-R") {
        const value = args[index + 1];
        if (value) {
          globalArgs.push(token, value);
          index += 1;
        }
        continue;
      }

      if (token.startsWith("-R") && token.length > 2) {
        globalArgs.push("-R", token.slice(2));
        continue;
      }

      if (token === "-m") {
        index += 1;
        continue;
      }

      if (token.startsWith("-m") && token.length > 2) {
        continue;
      }

      continue;
    }

    revsets.push(token);
  }

  return { globalArgs, revsets };
};
