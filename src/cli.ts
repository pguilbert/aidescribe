#!/usr/bin/env node

import { cli } from "cleye";
import aidescribeCommand from "./commands/aidescribe.js";
import configCommand from "./commands/config.js";
import connectCommand from "./commands/connect.js";
import pkg from "../package.json";

const { description, version } = pkg;

const rawArgv = process.argv.slice(2);

cli(
  {
    name: "aidescribe",
    version,
    flags: {
      provider: {
        type: String,
        description: "Override provider for this run (supported: openai, anthropic, mistral)",
      },
      locale: {
        type: String,
        description: "Override locale for this run (default: en)",
      },
      type: {
        type: String,
        alias: "t",
        description:
          "Message format for this run (default: conventional, supports: conventional, plain)",
      },
      maxLength: {
        type: Number,
        description:
          "Max generated title length for this run (default: 72, it's a soft guidance for the model, not a local hard cutoff)",
      },
      maxDiffChars: {
        type: Number,
        description: "Max diff chars sent to AI for this run (default: 40000)",
      },
      count: {
        type: Number,
        description: "Generate multiple description variants for this run (default: 1)",
      },
      verbose: {
        type: Boolean,
        description: "Print the exact prompt payload sent to the AI model for this run",
        default: false,
      },
    },
    commands: [configCommand, connectCommand],
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
