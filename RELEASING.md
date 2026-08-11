# Releasing Echadron

Echadron uses Changesets and `.github/workflows/release.yml`. Merging a user-facing
change with a changeset updates the release pull request. Merging that generated
pull request publishes `echadron`.

## First npm publication

npm cannot register a trusted publisher before the package exists. `echadron` is
an unscoped package, so it is public by definition and installs without an npm
scope. Bootstrap the first publication with a short-lived granular access token:

1. Confirm `npm whoami` returns `yaseenhq`, publishing 2FA is enabled, and
   `npm view echadron` still reports that the package does not exist.
2. Create a short-lived granular access token with read/write package permission
   and bypass 2FA enabled. Because `echadron` does not exist yet, do not assume npm
   can restrict this bootstrap token to that package.
3. Add the token as the repository Actions secret `NPM_TOKEN`.
4. Merge the generated `ci: release packages` pull request and verify
   `echadron`, its provenance statement, the Git tag, and the GitHub release.
5. Delete `NPM_TOKEN` immediately after the first successful publication.

Then configure npm Trusted Publishing for:

- GitHub owner: `YaseenHQ`
- Repository: `kimi`
- Workflow filename: `release.yml`
- Allowed action: `npm publish`

The release job already grants `id-token: write`, uses a current npm CLI, and
publishes with provenance. `NODE_AUTH_TOKEN` is empty after the bootstrap secret is
removed, so npm uses the workflow's OIDC identity. Re-check the package name
immediately before the first release because an unscoped npm name cannot be
reserved in advance.

## OAuth registrations

The ChatGPT and xAI account flows currently track Pi's public OAuth registrations
and provider-required `originator` / `referrer` values. Their client identifiers are
public identifiers, not secrets, and API-key providers remain available if either
vendor changes its allowlist.

Before calling a release stable, request dedicated native-app registrations from
OpenAI and xAI if those programs are available. A dedicated registration must be
implemented and tested as one complete flow: client id, redirect URI, scopes,
authorization parameters, token exchange, refresh, and request identity. Do not
change only the client id or remove the shared allowlist parameters speculatively.

## Native releases

Native assets are deliberately opt-in. npm publishing and documentation deployment
remain independent from Apple signing credentials.

Before enabling native releases:

1. Add the `APPLE_CERTIFICATE_P12`, `APPLE_CERTIFICATE_PASSWORD`,
   `APPLE_NOTARIZATION_KEY_P8`, `APPLE_NOTARIZATION_KEY_ID`, and
   `APPLE_NOTARIZATION_ISSUER_ID` repository secrets.
2. Run the `Manual Native Bundle` workflow and verify all six target archives.
3. Add the repository variable `ECHADRON_NATIVE_RELEASE_ENABLED=true`.

After that, publishing a new Echadron npm version also builds, signs and notarizes
macOS executables, creates checksummed archives, and uploads a manifest to the
matching GitHub release.

## Pre-release verification

Run:

```sh
pnpm install --frozen-lockfile
pnpm release:check
pnpm typecheck
pnpm lint
pnpm sherif
pnpm test
pnpm build
pnpm lint:pkg
```

For package-level verification, pack `apps/kimi-code`, install the tarball into an
empty project, and invoke `echadron`, `chad`, and `maker` from that installation.
