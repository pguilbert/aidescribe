<div align="center">

# aidescribe

**CLI that generates [Jujutsu](https://jj-vcs.github.io/jj/) change descriptions with AI.**

<img src=".github/image.png" alt="aidescribe demo" width="700" />

</div>

## Quick Start

```bash
# run without installing
npx aidescribe

# or install globally
pnpm add -g aidescribe
```

Generate a description:

```bash
# same arguments as `jj describe`
# aidescribe <REVSETS>
aidescribe
aidescribe -r @-
aidescribe -r abc123
```

## Requirements

- Node.js `>=22`
- `jj` installed
- Run inside a Jujutsu repository

## Setup

Run the interactive setup once to connect your AI provider and save config:

```bash
aidescribe connect
```

This saves config to `~/.aidescribe.json`. Currently OpenAI, Anthropic, and Mistral providers are supported.

## Config

View config:

```bash
aidescribe config
aidescribe config get provider
aidescribe config set variantCount=3
```
