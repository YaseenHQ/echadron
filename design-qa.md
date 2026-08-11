# Echadron homepage design QA

## Evidence

- Source visual truth: `/var/folders/nr/bm_3v8510zv5vv6fgfjfx7q00000gn/T/codex-clipboard-eef1dc5c-d2ea-4ab2-bc2f-2806fc760876.png`
- Source pixels: 2292 × 1900, normalized to 1280 × 1061 for comparison.
- Desktop implementation: `/Users/yaseen/kimi/output/echadron-home-desktop.png`
- Mobile implementation: `/Users/yaseen/kimi/output/echadron-home-mobile.png`
- Combined source/implementation comparison: `/Users/yaseen/kimi/output/echadron-home-comparison.png`
- Focused CTA contrast capture: `/Users/yaseen/kimi/output/echadron-home-cta.png`
- Focused neutral documentation capture: `/Users/yaseen/kimi/output/echadron-docs-neutral.png`
- Desktop CSS viewport: 1280 × 1061 at 1× density.
- Mobile CSS viewport: 390 × 844 at 1× density.
- State: English homepage, dark theme, npm selected.

The full-view comparison covers the hero, install control, second-section heading, and beginning of the real terminal image at equal normalized dimensions. Focused browser captures separately verified the complete terminal image and mobile install layout because those details are not readable in the normalized full-view pair.

## Findings

No actionable P0, P1, or P2 differences remain.

- **Fonts and typography**: Astryx `Heading` and `Text` components use the neutral theme’s system-backed Figtree stack. Display sizing, optical weight, line height, wrapping, and hierarchy follow the sparse Kimi reference without the removed eyebrow or logo lockup.
- **Spacing and layout rhythm**: the opening follows the reference’s product-first sequence: title, thesis, install surface, section heading, then terminal. The desktop hero was shortened during QA so the product image begins inside the normalized viewport. Mobile retains readable spacing and a contained two-row install control.
- **Colors and visual tokens**: the homepage and documentation now use a neutral gray scale. Search, links, callouts, borders, and docs chrome no longer inherit the previous blue palette. Contrast remains clear in both light and dark VitePress themes.
- **Image quality and asset fidelity**: the showcase is a native macOS Terminal-window capture of the actual Echadron 0.30.0 TUI at `/login`, including the real Kimi, ChatGPT, and xAI OAuth choices. Only the local directory, generated session identifier, and window-title text were sanitized. It replaces the invented HTML provider dashboard and preserves genuine Terminal chrome.
- **Copy and content**: subscription and IDE claims remain excluded. npm, pnpm, source-install, docs, and GitHub destinations correspond to repository documentation.
- **Brand accuracy**: the current changelog now begins with Echadron 0.30.0. Pre-fork entries are explicitly marked as inherited Kimi Code history, while Kimi Code remains visible only where it is the provider or historical product name. Stale `kimi` executable examples in current reference and IDE pages were corrected to `echadron`.
- **Accessibility and interaction**: Astryx `SegmentedControl` exposes radio semantics; Astryx `Button` supplies focus, pressed, and status behavior. Install selection and visible copied confirmation were tested. Links remain keyboard reachable.

## Comparison history

1. The first Astryx render exposed a P2 composition mismatch: the 710 px hero kept the terminal image outside the normalized first view.
2. The desktop hero was reduced to 560 px; showcase top padding and image margin were tightened.
3. Post-fix evidence at 1280 × 1061 shows the real terminal image beginning in the first view while preserving the centered product hierarchy.
4. A development-only React mount race appeared during hot replacement. The Vue host now retains and validates the target element after asynchronous imports; subsequent reloads completed without a new console error.
5. Browser annotation exposed a P1 contrast failure in the light Astryx primary CTA: its inherited foreground and background were both near-white. The homepage now pins the primary CTA foreground to `#171716`; focused browser evidence measures `rgb(23, 23, 22)` on `rgb(235, 235, 235)`.
6. The same pass exposed P2 blue drift in documentation `tip` blocks and the dark navigation backdrop. Hardcoded Apple-blue and blue-black RGBA values were replaced with the neutral documentation surface tokens. The post-fix dark tip surface measures `rgb(34, 34, 32)` and the navigation backdrop `rgba(16, 16, 16, 0.78)`.

## Interactions and runtime checks

- npm → pnpm selection updates the command to `pnpm add -g echadron`.
- Copy action changes the Astryx button label from `Copy` to `Copied`.
- Source-install link targets the matching localized getting-started section.
- Desktop and 390 × 844 mobile layouts were captured in the in-app browser.
- The desktop comparison was regenerated after replacing the showcase asset with the native Terminal capture.
- Documentation search and link colors were inspected as neutral computed values.
- Primary CTA foreground/background contrast and neutral tip/navigation computed colors were inspected after hot reload.
- `pnpm -C docs build` passed after the final implementation.

## Follow-up polish

- P3: bundle Figtree locally if Echadron later adopts it as a formal brand typeface; the current Astryx theme correctly falls back to platform sans fonts.

final result: passed
