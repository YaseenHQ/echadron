# Echadron for VS Code

AI coding assistant for VS Code, built for long-context workflows and complex coding tasks.

## Features

- **Works alongside you**: Echadron autonomously explores your codebase, reads and writes code, and runs terminal commands with your permission
- **Thinking controls**: Toggle reasoning or choose a model-supported thinking effort
- **Provider-aware models**: Distinguish and select same-named models across configured providers
- **Native editor integration**: Review AI-proposed changes directly in VS Code's diff viewer
- **MCP support**: Extend capabilities with Model Context Protocol servers
- **Slash commands**: Quick actions like `/init` to analyze your project and `/compact` to manage context

## Install

Echadron requires VS Code 1.100.0 or later.

1. Install the Echadron VSIX or marketplace build published by YaseenHQ.
2. Open a folder in VS Code
3. Click the Echadron icon in the Activity Bar
4. Sign in with a configured provider, including the Kimi provider (OAuth), or use a provider already configured in the shared `config.toml`

The extension runs the shared Node SDK in the VS Code Extension Host. When the
extension and the Echadron terminal app resolve to the same `ECHADRON_HOME`,
they share `config.toml`, MCP configuration, login state, and
sessions. Set `ECHADRON_HOME` to choose the shared home; the legacy
`KIMI_CODE_HOME` variable remains supported for migration. There is no separate
VS Code setting for it. Do not run the same session from
both applications at the same time, because cross-process session locking is
not guaranteed.

After upgrading from version 0.5.x, the extension prompts before migrating any
legacy data it finds. Migration copies or merges data into the current Echadron
home and does not delete the legacy source. Legacy Kimi Code OAuth and MCP OAuth
credentials are not copied, so those connections must be authorized again.
See [the changelog](CHANGELOG.md) for the full compatibility notes.

## Docs

Echadron documentation is maintained in the [repository docs](https://github.com/YaseenHQ/kimi/tree/main/docs/en).

## License

[Apache-2.0](LICENSE)
