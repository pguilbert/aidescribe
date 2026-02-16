#!/usr/bin/env node

import { cli } from "cleye";
import aidescribeCommand from "./commands/aidescribe.js";
import configCommand from "./commands/config.js";
import pkg from "../package.json";

const { description, version } = pkg;

const rawArgv = process.argv.slice(2);

cli(
  {
    name: "aidescribe",
    version,
    flags: {
      aiProvider: {
        type: String,
        description:
          "Override provider for this run (supported: openai, anthropic)",
      },
      aiApiKey: {
        type: String,
        description:
          "Override provider API key for this run (maps to <provider>.apiKey)",
      },
      aiModel: {
        type: String,
        description:
          "Override provider model for this run (maps to <provider>.model)",
      },
      aiLocale: {
        type: String,
        description: "Override locale for this run (default: en)",
      },
      aiType: {
        type: String,
        description:
          "Message format for this run (default: conventional, supports: conventional, plain)",
      },
      aiMaxLength: {
        type: Number,
        description: "Max generated title length for this run (default: 72)",
      },
      aiMaxDiffChars: {
        type: Number,
        description: "Max diff chars sent to AI for this run (default: 40000)",
      },
      verbose: {
        type: Boolean,
        description:
          "Print the exact prompt payload sent to the AI model for this run",
        default: false,
      },
    },
    commands: [configCommand],
    help: {
      description,
    },
    ignoreArgv: (type) => type === "unknown-flag" || type === "argument",
  },
  (argv) => {
    aidescribeCommand(argv.flags, rawArgv);
  },
  rawArgv,
);
