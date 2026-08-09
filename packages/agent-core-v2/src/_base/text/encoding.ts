/** Pure helpers for detecting and decoding UTF text files. */

export type UtfTextEncoding = 'utf-8' | 'utf-16le' | 'utf-16be';

export interface TextEncodingDetection {
  readonly encoding: UtfTextEncoding;
  readonly seemsBinary: boolean;
}

export const ENCODING_DETECTION_SAMPLE_BYTES = 512;

const MIN_ZERO_BYTES_FOR_UTF16 = 2;

/** Detect UTF-8/UTF-16 from BOMs or a conservative BOM-less zero-byte pattern. */
export function detectTextEncoding(sample: Uint8Array): TextEncodingDetection {
  if (sample.length >= 2) {
    const b0 = sample[0]!;
    const b1 = sample[1]!;
    if (b0 === 0xfe && b1 === 0xff) return { encoding: 'utf-16be', seemsBinary: false };
    if (b0 === 0xff && b1 === 0xfe) return { encoding: 'utf-16le', seemsBinary: false };
    if (
      sample.length >= 3 &&
      b0 === 0xef &&
      b1 === 0xbb &&
      sample[2] === 0xbf
    ) {
      return { encoding: 'utf-8', seemsBinary: false };
    }
  }

  let zerosAtOdd = 0;
  let zerosAtEven = 0;
  const limit = Math.min(sample.length, ENCODING_DETECTION_SAMPLE_BYTES);
  for (let i = 0; i < limit; i += 1) {
    if (sample[i] !== 0) continue;
    if (i % 2 === 1) zerosAtOdd += 1;
    else zerosAtEven += 1;
  }

  if (zerosAtOdd === 0 && zerosAtEven === 0) {
    return { encoding: 'utf-8', seemsBinary: false };
  }
  if (zerosAtEven === 0 && zerosAtOdd >= MIN_ZERO_BYTES_FOR_UTF16) {
    return { encoding: 'utf-16le', seemsBinary: false };
  }
  if (zerosAtOdd === 0 && zerosAtEven >= MIN_ZERO_BYTES_FOR_UTF16) {
    return { encoding: 'utf-16be', seemsBinary: false };
  }
  return { encoding: 'utf-8', seemsBinary: true };
}

export function decodeUtfText(bytes: Uint8Array, encoding: UtfTextEncoding): string {
  return new TextDecoder(encoding, { fatal: false }).decode(bytes);
}
