import { describe, expect, it } from 'vitest';

import { READ_DOCUMENT_EXTENSIONS } from '#/agent/tools/os/readDocument/readDocument';
import {
  extensionOf,
  isSupportedDocument,
} from '#/agent/tools/os/readDocument/readDocumentTool';

describe('ReadDocument', () => {
  it('recognises the document formats it converts', () => {
    for (const ext of READ_DOCUMENT_EXTENSIONS) {
      expect(isSupportedDocument(`/tmp/report.${ext}`), ext).toBe(true);
    }
  });

  it('leaves text formats to Read', () => {
    for (const path of ['a.ts', 'a.md', 'a.json', 'a.txt', 'a.png', 'Makefile']) {
      expect(isSupportedDocument(`/tmp/${path}`), path).toBe(false);
    }
  });

  it('matches the extension case-insensitively', () => {
    expect(isSupportedDocument('/tmp/Report.PDF')).toBe(true);
    expect(isSupportedDocument('/tmp/Deck.DocX')).toBe(true);
  });

  it('does not treat a dotfile as an extension', () => {
    expect(extensionOf('/tmp/.pdf')).toBe('');
    expect(isSupportedDocument('/tmp/.pdf')).toBe(false);
  });

  it('uses the last extension of a multi-dot name', () => {
    expect(extensionOf('/tmp/archive.tar.pdf')).toBe('pdf');
    expect(extensionOf('/tmp/notes.pdf.bak')).toBe('bak');
  });

  it('ignores dots in parent directories', () => {
    expect(extensionOf('/tmp/v1.2/README')).toBe('');
  });
});
