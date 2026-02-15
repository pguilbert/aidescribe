# aidescribe

`aidescribe` is a CLI for Jujutsu (`jj`) that generates a change description
from `jj diff` and applies it with `jj describe`.

## Install

```bash
npm install
npm run build
npm link
```

## Usage

```bash
aidescribe
```

This command:

1. runs `jj diff`
2. sends the diff to an LLM using the [AI SDK](https://ai-sdk.dev/)
3. lets you confirm or edit the generated message (via `@clack/prompts`)
4. runs `jj describe -m "<message>"` with your args forwarded

All unknown arguments are forwarded to `jj describe`, so this also works:

```bash
aidescribe --at-operation @- @
```

## Configuration

`aidescribe` loads config with this precedence:

1. CLI flags (one run only)
2. Environment variables
3. Config file (`~/.aidescribe`)
4. Built-in defaults

### Config Command

Set values:

```bash
aidescribe config set OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-4o-mini type=conventional
```

Read values:

```bash
aidescribe config
aidescribe config get OPENAI_MODEL locale type
```

### One-Run CLI Overrides

```bash
aidescribe --ai-model gpt-4.1-mini --ai-locale en --ai-max-length 72
```

Available override flags:

- `--ai-api-key`
- `--ai-base-url`
- `--ai-model`
- `--ai-locale`
- `--ai-type` (`conventional` or `plain`)
- `--ai-max-length`
- `--ai-max-diff-chars`
- `--verbose` (prints the exact system prompt and diff payload sent to the model)

### Environment Variables

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, default: `gpt-4o-mini`)
- `OPENAI_BASE_URL` (optional; for OpenAI-compatible providers)
- `AIDESCRIBE_LOCALE` (optional, default: `en`)
- `AIDESCRIBE_TYPE` (optional, default: `conventional`, supports `conventional` and `plain`)
- `AIDESCRIBE_MAX_LENGTH` (optional, default: `72`)
- `AIDESCRIBE_MAX_DIFF_CHARS` (optional, default: `40000`)
