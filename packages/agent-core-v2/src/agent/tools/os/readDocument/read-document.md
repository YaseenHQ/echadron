Read a Word, PowerPoint, Excel, OpenDocument, RTF, EPUB, CSV, or PDF file as Markdown.

Use this instead of `Read` for those formats — `Read` returns their raw bytes, which are unusable. Everything else (source code, plain text, JSON, Markdown) still goes through `Read`.

Conversion is local; nothing is uploaded. Large documents are truncated to fit the message, keeping the beginning.
