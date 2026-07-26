# Imperium branding

Imperium is the fork-owned product name for this multi-provider agent harness.

The npm package currently exposes both `imperium` (preferred) and `kimi`
(compatibility). Native artifacts still use the upstream `kimi` executable until
their packaging path grows an equivalent alias.

The `@moonshot-ai/*` package scopes, `KIMI_*` environment variables, provider
identifiers, storage paths, and OAuth keys remain compatibility interfaces. They
must not be renamed as part of a surface rebrand: changing them would break
existing installations and make upstream synchronization unnecessarily costly.
