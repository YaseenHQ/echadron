---
"echadron": minor
---

Added a `ReadDocument` tool. Reads Word, PowerPoint, Excel, OpenDocument, RTF, EPUB, CSV and PDF files as Markdown, so the agent can work with documents instead of getting raw bytes back from `Read`. Conversion runs locally through `@firecrawl/anydoc`; nothing is uploaded. An optional dependency, matching how the native terminal helpers already ship: platforms with no prebuilt binary install fine and report that the file cannot be read, rather than failing the install or crashing.
