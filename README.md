# aidescribe

`aidescribe` is a small CLI for Jujutsu (`jj`) that generates a change
description from `jj diff` and applies it with `jj describe`.

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

All arguments are forwarded to `jj describe`, so this also works:

```bash
aidescribe --at-operation @- @
```

## Configuration

Environment variables:

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, default: `gpt-4o-mini`)
- `OPENAI_BASE_URL` (optional; for OpenAI-compatible providers)
- `AIDESCRIBE_LOCALE` (optional, default: `en`)
- `AIDESCRIBE_MAX_LENGTH` (optional, default: `72`)
- `AIDESCRIBE_MAX_DIFF_CHARS` (optional, default: `40000`)
