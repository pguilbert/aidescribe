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

If `jj diff` is empty for the targeted revision(s), `aidescribe` exits early
without calling the AI or updating the description.

All unknown arguments are forwarded to `jj describe`, so this also works:

```bash
aidescribe --at-operation @- @
```

When revsets are provided (for example `aidescribe @-` or `aidescribe @- @`),
the same revset target is also used for `jj diff` during AI message generation.

If a current description already exists on the target revision(s), it is included
in the AI prompt so the model can refine it when relevant or replace it when not.

## Configuration

`aidescribe` loads config with this precedence:

1. CLI flags (one run only)
2. Environment variables
3. Config file (`~/.aidescribe.json`)
4. Built-in defaults

Example `~/.aidescribe.json`:

```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-5-mini",
  "locale": "en",
  "type": "conventional",
  "maxLength": 72,
  "maxDiffChars": 40000
}
```

### Config Command

Set values:

```bash
aidescribe config set provider=openai apiKey=sk-... model=gpt-5-mini
aidescribe config set provider=anthropic apiKey=sk-ant-... model=claude-3-5-haiku-latest
```

Read values:

```bash
aidescribe config
aidescribe config get provider model locale type
```

### One-Run CLI Overrides

```bash
aidescribe --ai-provider anthropic --ai-model claude-3-5-haiku-latest --ai-locale en
```

Available override flags:

- `--ai-provider` (`openai` or `anthropic`)
- `--ai-api-key`
- `--ai-model`
- `--ai-locale`
- `--ai-type` (`conventional` or `plain`)
- `--ai-max-length`
- `--ai-max-diff-chars`
- `--verbose` (prints the exact system prompt and diff payload sent to the model)

### Environment Variables

- `AIDESCRIBE_PROVIDER` (optional, default: `openai`, supports `openai` and `anthropic`)
- `AIDESCRIBE_API_KEY` (required)
- `AIDESCRIBE_MODEL` (optional, default: `gpt-5-mini` or `claude-3-5-haiku-latest` based on provider)
- `AIDESCRIBE_LOCALE` (optional, default: `en`)
- `AIDESCRIBE_TYPE` (optional, default: `conventional`, supports `conventional` and `plain`)
- `AIDESCRIBE_MAX_LENGTH` (optional, default: `72`)
- `AIDESCRIBE_MAX_DIFF_CHARS` (optional, default: `40000`)
