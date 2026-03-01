<div align="center">

# aidescribe

**CLI that generates [Jujutsu](https://jj-vcs.github.io/jj/) change descriptions with AI.**

<img src=".github/image.png" alt="aidescribe demo" width="700" />

</div>

## Usage

### Quick start

```bash
# run without installing
npx aidescribe
```

Or install globally:

```bash
pnpm add -g aidescribe
```

### Generate descriptions

aidescribe takes the same arguments as `jj describe`. For example:

```bash
# describe current change
aidescribe

# describe parent change
aidescribe -r @-

# describe a specific revision
aidescribe -r abc123
```

## Requirements

- Node.js `>=22`
- `jj` installed and run from inside a Jujutsu repository

## Config

### Interactive setup

```bash
aidescribe connect
```

This wizard configures `provider`, `apiKey`, and `model`.
The configuration is stored in `~/.aidescribe.json`.

### View config

```bash
# print all config
aidescribe config

# get one key
aidescribe config get provider
```

### Set config

```bash
# set active provider
aidescribe config set provider=openai

# set provider-specific values
aidescribe config set providers.openai.apiKey=sk-... providers.openai.model=gpt-5-mini

# set shared generation settings
aidescribe config set locale=en type=conventional maxLength=72 maxDiffChars=40000
```

`config set` also supports provider aliases for the active provider:

```bash
aidescribe config set apiKey=sk-... model=gpt-5-mini
```

### With Anthropic

```bash
aidescribe config set provider=anthropic providers.anthropic.apiKey=sk-ant-...
```

Uses `claude-haiku-4-5` by default. Override with:

```bash
aidescribe config set providers.anthropic.model=claude-sonnet-4-5
```

### With OpenAI

```bash
aidescribe config set provider=openai providers.openai.apiKey=sk-...
```

Uses `gpt-5-mini` by default. Override with:

```bash
aidescribe config set providers.openai.model=gpt-4o
```

### With Mistral

```bash
aidescribe config set provider=mistral providers.mistral.apiKey=...
```

Uses `mistral-small-latest` by default. Override with:

```bash
aidescribe config set providers.mistral.model=mistral-medium-latest
```

## Troubleshooting

- `apiKey is required for provider ...`: set it with `aidescribe connect` or `aidescribe config set providers.<provider>.apiKey=...`
- `No changes found in jj diff`: run in the target repo and confirm the revision has changes
- Invalid config errors: inspect `~/.aidescribe.json` with `aidescribe config` and fix invalid keys/values

## Development

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

## License

MIT
