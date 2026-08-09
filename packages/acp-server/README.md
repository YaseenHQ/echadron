# `@moonshot-ai/acp-server`

Experimental ACP protocol-v2 transport for Echadron.

The package deliberately sits beside `@moonshot-ai/acp-adapter`: the stable
adapter continues to own ACP v1, while this package uses the official SDK's
`@agentclientprotocol/sdk/experimental/v2` entry point and reuses the existing
Echadron `KimiHarness` session/event mapping. This lets clients opt into v2
without changing the current provider, auth, or session stores.

ACP v2 is a draft and this package must not be treated as a stable wire
contract. It follows the active v2 RFDs for prompt acknowledgement and state
updates, whole-message replay, tool-call upserts, structured permissions,
agent-owned display-only terminals, item-based plans, and explicit additional
workspace roots. See the [ACP v2 proposal](https://agentclientprotocol.com/rfds/v2/overview)
and the [v2 migration guide](https://agentclientprotocol.com/protocol/v2/migration).
