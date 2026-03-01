<div align="center">

# aidescribe

**CLI that generates [Jujutsu](https://jj-vcs.github.io/jj/) change descriptions with AI.**

<img src=".github/image.png" alt="aidescribe demo" width="700" />

</div>

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

`aidescribe config set` also supports active-provider aliases: `apiKey`, `model`, and `baseURL`.
For example, after `provider=mistral`, `aidescribe config set model=mistral-medium-latest` updates `providers.mistral.model`.

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
