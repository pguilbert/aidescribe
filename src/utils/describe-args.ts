type DescribeArgsForDiff = {
  globalArgs: string[];
  revsets: string[];
};

export const parseDescribeArgsForDiff = (args: string[]): DescribeArgsForDiff => {
  const revsets: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--") {
      continue;
    }

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

    if (token.startsWith("-")) {
      continue;
    }

    revsets.push(token);
  }

  return { globalArgs: [], revsets };
};
