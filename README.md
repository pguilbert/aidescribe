# aidescribe

CLI that generates [Jujutsu](https://jj-vcs.github.io/jj/) change descriptions with AI.

## Install

```bash
pnpm add -g aidescribe
```

## Config

```bash
aidescribe config set provider=anthropic anthropic.apiKey=sk-ant-...
```

## Usage

```bash
# describe current change
aidescribe

# describe parent change
aidescribe -r @-
```
