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
- `opencode` installed and authenticated
- Run inside a Jujutsu repository

## Setup

Run the setup wizard once:

```bash
aidescribe connect
```

This saves config to `~/.aidescribe.json`.

`aidescribe` now uses the `opencode run` CLI under the hood. This keeps provider/tooling support in OpenCode, so future integrations (like Codex or Claude Code style providers) can be added without embedding provider SDKs.

## Config

View config:

```bash
aidescribe config
aidescribe config get provider
```

Common keys:

```bash
# choose provider (currently only opencode)
aidescribe config set provider=opencode

# optional: force a model (provider/model)
aidescribe config set providers.opencode.model=openai/gpt-5-mini

# optional: select an opencode agent
aidescribe config set providers.opencode.agent=default

# optional: override executable path/command
aidescribe config set providers.opencode.command=opencode
```
