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
      aiApiKey: {
        type: String,
        description: "Override OPENAI_API_KEY for this run",
      },
      aiBaseUrl: {
        type: String,
        description: "Override OPENAI_BASE_URL for this run",
      },
      aiModel: {
        type: String,
        description: "Override OPENAI_MODEL for this run",
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
