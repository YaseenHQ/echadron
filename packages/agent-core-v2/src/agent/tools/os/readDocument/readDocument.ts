/**
 * `tools` domain (L7) — `ReadDocument` contract.
 *
 * `Read` returns bytes, which is useless for a Word file or a PDF. This
 * converts those formats to Markdown so the model can actually read them.
 */

import { z } from 'zod';

import { createDecorator } from '#/_base/di/instantiation';
import { type AgentTool } from '#/tool/toolContract';

/** Extensions anydoc recognises; used to advertise support without probing. */
export const READ_DOCUMENT_EXTENSIONS = [
  'pdf',
  'docx',
  'doc',
  'pptx',
  'ppt',
  'xlsx',
  'xls',
  'odt',
  'odp',
  'ods',
  'rtf',
  'epub',
  'csv',
] as const;

export const ReadDocumentInputSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1)
    .describe('Path to the document. Relative paths resolve against the working directory.'),
});

export type ReadDocumentInput = z.infer<typeof ReadDocumentInputSchema>;

export interface IReadDocumentTool extends AgentTool {}

export const IReadDocumentTool = createDecorator<IReadDocumentTool>('readDocumentTool');
