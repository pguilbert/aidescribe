import type { CommitType } from "./config-types.js";

const conventionalCommitTypes = JSON.stringify(
  {
    docs: "Documentation only changes",
    style:
      "Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)",
    refactor:
      "A code change that improves code structure without changing functionality (renaming, restructuring classes/methods, extracting functions, etc)",
    perf: "A code change that improves performance",
    test: "Adding missing tests or correcting existing tests",
    build: "Changes that affect the build system or external dependencies",
    ci: "Changes to our CI configuration files and scripts",
    chore: "Other changes that don't modify src or test files",
    revert: "Reverts a previous commit",
    feat: "A new feature",
    fix: "A bug fix",
  },
  null,
  2,
);

const commitTypeRules: Record<CommitType, string> = {
  conventional: `Choose a type from the type-to-description JSON below that best describes the git diff:\n${conventionalCommitTypes}`,
  plain: "",
};

const outputFormat: Record<CommitType, string> = {
  conventional: "<type>[optional (<scope>)]: <commit message>",
  plain: "<commit message>",
};

export const generatePrompt = (
  locale: string,
  maxLength: number,
  type: CommitType,
) =>
  [
    "Generate a concise git commit message title in present tense that precisely describes the key changes in the following code diff. Focus on what was changed, not just file names. Provide only the title, no description or body.",
    `Message language: ${locale}`,
    `Commit message must be a maximum of ${maxLength} characters.`,
    "Exclude anything unnecessary such as translation. Your entire response will be passed directly into jj describe.",
    `IMPORTANT: Do not include any explanations, introductions, or additional text. Do not wrap the commit message in quotes or any other formatting. The commit message must not exceed ${maxLength} characters. Respond with ONLY the commit message text.`,
    "Be specific: include concrete details (package names, versions, functionality) rather than generic statements.",
    commitTypeRules[type],
    `The output response must be in format:\n${outputFormat[type]}`,
  ]
    .filter(Boolean)
    .join("\n");
