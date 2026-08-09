# `echadron acp` Subcommand

`echadron acp` switches Echadron to **ACP (Agent Client Protocol)** mode: it communicates with an ACP client (such as Zed, JetBrains AI Chat, etc.) via JSON-RPC over stdin/stdout, letting the IDE directly drive Echadron sessions, prompts, and tool calls.

```sh
echadron acp
```

Once started, the command prints no banner and immediately waits for the ACP client to send an `initialize` request on stdin. Logs are written to stderr (as well as the diagnostic log under `~/.echadron/logs/`), so the ACP channel itself stays clean.

::: tip Who calls this?
You typically do not need to run `echadron acp` manually — this command is the subprocess entry point for IDEs. For IDE-side configuration, see [Using in IDEs](../guides/ides.md).
:::

## Experimental ACP protocol v2

Echadron also ships an explicit `echadron acp-v2` entry point for the draft ACP v2 protocol:

```sh
echadron acp-v2
```

This is intentionally separate from `echadron acp`. It uses the ACP TypeScript SDK's experimental v2 transport (including JSON-RPC batches), required message IDs, unified tool-call upserts, agent-owned display-only terminals, structured plan/state updates, and the v2 `auth/login` / `auth/logout` surface. The existing Echadron session and provider configuration remain the source of truth, so switching entry points does not create a second login or model store.

ACP v2 is still an unstable, opt-in protocol. Clients should only launch this command when they explicitly negotiate protocol version `2`; production integrations should keep using `echadron acp` until their ACP client supports the v2 draft. See the [ACP v2 proposal](https://agentclientprotocol.com/rfds/v2/overview) for the breaking changes and migration status.

## ACP v1 capability matrix

The table below lists the capabilities declared by the stable ACP v1 adapter layer. It does not describe `echadron acp-v2`; v2 uses the unified `capabilities` field described below.

| Capability | Value | Description |
| --- | --- | --- |
| `promptCapabilities.image` | `true` | Supports ACP `image` content blocks (base64 + mimeType) |
| `promptCapabilities.audio` | `false` | Audio prompts not yet supported |
| `promptCapabilities.embeddedContext` | `true` | Client may send `resource`/`resource_link` embedded resource blocks; text content is injected into the prompt as `<resource uri="...">...</resource>`; blob resources are dropped with a warn |
| `mcpCapabilities.http` | `true` | Forwards HTTP MCP services configured by the IDE |
| `mcpCapabilities.sse` | `true` | Forwards legacy SSE MCP services configured by the IDE |
| `loadSession` | `true` | Supports `session/load` to resume an existing session, replaying history on load |
| `sessionCapabilities.list` | `{}` | Supports `session/list` to enumerate the current user's sessions |
| `sessionCapabilities.additionalDirectories` | `{}` | Accepts additional workspace roots on new/load/resume and reports them from `session/list` |

## ACP v2 capability and lifecycle surface

The experimental v2 server returns this session capability object from `initialize`:

```json
{
  "session": {
    "delete": {},
    "additionalDirectories": {}
  }
}
```

The presence of `session` makes `session/new`, `session/list`, `session/resume`,
`session/close`, `session/prompt`, `session/cancel`, and `session/update` the
baseline lifecycle surface; v2 does not advertise separate list/resume/close
markers. `additionalDirectories` is an explicit full list on `session/new` and
`session/resume`: omitted and empty values activate no additional roots, while
provided paths must be absolute. `session/resume` can request full replay with
`replayFrom: {"type":"start"}`; omitting it resumes without replay.

The server also advertises Echadron's terminal OAuth method through the preview
terminal-auth shape and implements the required `auth/login` and `auth/logout`
methods. The stable v1 `echadron acp` command remains unchanged.

## ACP Method Coverage

The spec divides methods into a **stable** surface and an evolving **unstable** surface (handlers mounted with the `unstable_*` prefix in `@agentclientprotocol/sdk@0.23.0`). The two have entirely different stability guarantees — the stable surface covers methods every production ACP client uses, while the unstable surface covers experimental extensions (inline-edit prediction, document buffer sync, provider management, elicitation, etc.) — so they are tracked separately.

**Summary: stable agent-side 10/12 (83%) + client reverse-RPC 4/9 (44%); unstable surface has only `session/set_model` (1/19).** All methods needed for a normal agent flow (initialize → auth → new/load/resume → prompt → cancel + file I/O + tool approval) are implemented.

### Stable agent-side — IDE → agent (10 / 12)

| Method | Implemented | Description |
| --- | --- | --- |
| `initialize` | Yes | Version negotiation; returns `agentInfo: { name: 'Echadron', version }`, capability matrix, and the `Login with Echadron (OAuth)` terminal auth method |
| `authenticate` | Yes | Validates `method_id='login'`; reloads the live config after terminal OAuth auth and returns `authRequired (-32000)` if no usable provider is configured |
| `session/new` | Yes | Accepts `cwd` / `additionalDirectories` / `mcpServers`; returns `configOptions[]` |
| `session/load` | Yes | Restores a session from disk and replays history via `session/update` |
| `session/resume` | Yes | Lightweight sibling of `session/load`; skips history replay |
| `session/prompt` | Yes | Accepts `text` / `image` / `resource` / `resource_link` content blocks; streams `agent_message_chunk` |
| `session/cancel` | Yes | Interrupts the current turn |
| `session/list` | Yes | Enumerates sessions on disk (advertised via `sessionCapabilities.list = {}`) |
| `session/set_mode` | Yes | Compatibility path; dispatches to the same handler as `set_config_option({configId:'mode'})` |
| `session/set_config_option` | Yes | Unified model / thinking / mode picker dispatcher |
| `session/close` | No | |
| `logout` | No | |

### Stable client-side reverse-RPC — agent → IDE (4 / 9)

| Method | Implemented | Description |
| --- | --- | --- |
| `session/update` | Yes | Streams `agent_message_chunk` / `tool_call*` / `plan` / `config_option_update` / `available_commands_update` / unstable `usage_update` |
| `session/request_permission` | Yes | Shared channel for tool approval and question elicitation |
| `fs/read_text_file` | Yes | File reads at the kaos layer are routed to the client (advertised via `fsCapabilities`) |
| `fs/write_text_file` | Yes | File writes at the kaos layer are routed to the client |
| `terminal/create` · `output` · `release` · `kill` · `wait_for_exit` | No | Terminal reverse-RPC not connected; shell commands use local execution |

### Unstable surface (1 / 19)

| Method | Implemented | Description |
| --- | --- | --- |
| `session/set_model` | Yes | Compatibility path; equivalent to `set_config_option({configId:'model'})` |
| Remaining 18 methods | No | Includes session lifecycle extensions, buffer sync, inline-edit prediction, provider management, etc. |

Model rows in `configOptions` are rebuilt from the live Echadron config. Their canonical `_meta['echadron:model']` metadata (plus the deprecated `_meta['imperium:model']` compatibility key) includes the provider/model id, protocol, capabilities, and non-secret context/input/output limits imported from models.dev. During a prompt, `usage_update` carries the current and maximum context tokens so clients can render the same context-window state as the TUI. Provider management (`providers/list`, `providers/set`, `providers/disable`) remains intentionally unadvertised until credential replacement and OAuth account switching can be made transactional and safe over ACP.

All methods not listed above return `methodNotFound`.

## MCP Forwarding

When an ACP client provides `mcpServers` in `session/new` or `session/load`, the adapter layer performs the following conversions:

- `http` → Echadron's `transport: 'http'` configuration
- `stdio` → Echadron's `transport: 'stdio'` configuration
- `sse` → Echadron's `transport: 'sse'` configuration
- `acp` → discarded with a warn log entry

## Next steps

- [Using in IDEs](../guides/ides.md) — Zed / JetBrains configuration steps and troubleshooting
- [`echadron` Command Reference](./kimi-command.md) — Complete subcommand list
