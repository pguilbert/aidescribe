# aidescribe

CLI that generates [Jujutsu](https://jj-vcs.github.io/jj/) change descriptions with AI.

## Usage

```bash
# describe current change
npx aidescribe

# describe parent change
npx aidescribe -r @-
```

Or install globally:

```bash
pnpm add -g aidescribe
```

## Config

### With Anthropic

```bash
aidescribe config set provider=anthropic anthropic.apiKey=sk-ant-...
```

Uses `claude-haiku-4-5` by default. Override with:

```bash
aidescribe config set anthropic.model=claude-sonnet-4-5
```

### With OpenAI

```bash
aidescribe config set provider=openai openai.apiKey=sk-...
```

Uses `gpt-5-mini` by default. Override with:

```bash
aidescribe config set openai.model=gpt-4o
```
