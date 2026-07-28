# Using Echadron in IDEs

Echadron supports integration into IDEs via the [Agent Client Protocol (ACP)](https://agentclientprotocol.com/), letting you use AI-assisted coding directly inside your editor.

## Prerequisites

Before configuring your IDE, make sure Echadron is installed and you have completed `/login` setup, or use an ACP client with terminal authentication.

The ACP adapter is exposed as the `echadron acp` subcommand. The IDE launches it as a child process and communicates over stdin/stdout using JSON-RPC. Each time the IDE creates a session, Echadron reuses its existing authentication state — no need to log in again.

::: tip Path note
Child processes launched from an IDE GUI on macOS typically do **not** inherit the terminal shell's `PATH`. If `echadron` is not in a system directory like `/usr/local/bin`, use the absolute path in your IDE configuration. Run `which echadron` in a terminal to find the active path.
:::

## Using Echadron in Zed

[Zed](https://zed.dev/) is a modern editor with native ACP support.

Add the following to Zed's config file at `~/.config/zed/settings.json`:

```json
{
  "agent_servers": {
    "Echadron": {
      "type": "custom",
      "command": "echadron",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

Configuration fields:

- `type`: fixed value `"custom"`
- `command`: path to the Echadron executable. If `echadron` is not on `PATH`, use the full path (e.g. `/Users/you/.local/bin/echadron`).
- `args`: startup arguments. The `acp` subcommand switches the CLI into ACP mode.
- `env`: additional environment variables; usually leave this empty. Zed injects a default environment automatically.

After saving, open a new conversation in Zed's Agent panel and it will launch an `Echadron` ACP subprocess using the configuration above. MCP servers declared in Zed's `agent_servers` section are also forwarded to Echadron via ACP.

## Using Echadron in JetBrains IDEs

JetBrains IDEs (IntelliJ IDEA, PyCharm, WebStorm, etc.) support ACP through the AI chat plugin.

If you do not have a JetBrains AI subscription, you can enable `llm.enable.mock.response` in the Registry to access the AI chat panel in ACP-only scenarios. Press Shift twice and search for "Registry" to open it.

In the AI chat panel menu, click **Configure ACP agents** and add the following configuration:

```json
{
  "agent_servers": {
    "Echadron": {
      "command": "~/.local/bin/echadron",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

JetBrains is strict about the `command` field — always use an **absolute path**, which you can get by running `which echadron` in a terminal. After saving, `Echadron` will appear in the AI chat's agent selector.

## Using Echadron in Paseo

[Paseo](https://paseo.sh/) is a self-hosted orchestrator that runs and supervises agent CLIs from your desktop, web, and mobile. It connects to Echadron over ACP, the same way an IDE does.

Pick **Echadron** from Paseo's built-in ACP provider catalog, or add a custom provider in `~/.paseo/config.json`:

```json
{
  "agents": {
    "providers": {
      "echadron": {
        "extends": "acp",
        "label": "Echadron",
        "command": ["echadron", "acp"]
      }
    }
  }
}
```

Paseo's generic ACP adapter does not drive the login flow, so complete the terminal login first (see [Prerequisites](#prerequisites)) — otherwise session creation fails with `Authentication required`.

## Troubleshooting

- **Session disconnects immediately / IDE shows "agent exited"**: usually a wrong `command` path or a missing login. Run `echadron acp` in a terminal first to verify — if it blocks waiting for stdin, the CLI itself is fine and the problem is in the IDE configuration; if it exits immediately with an error, follow the error message (most commonly you need to run `/login`).
- **IDE shows "auth required"**: Echadron has no usable authentication token. Exit the IDE, run `echadron` in a terminal to complete login, then restart the IDE.
- **MCP tools not visible**: check the [`echadron acp` reference](../reference/kimi-acp.md) capability table to confirm that the MCP transport type configured in your IDE is supported. The Echadron ACP adapter currently supports `http`, `stdio`, and `sse` transports; `acp` transport MCP servers are silently dropped and a warning is written to the log.

## Next steps

- [echadron acp reference](../reference/kimi-acp.md) — ACP capability matrix and method coverage details
- [echadron command reference](../reference/kimi-command.md) — full subcommand list
