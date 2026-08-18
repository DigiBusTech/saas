/**
 * Text chunking utility for knowledge base documents.
 * Splits text into overlapping chunks suitable for embedding generation.
 */

export interface TextChunk {
  index: number;
  text: string;
}

export function chunkText(
  text: string,
  maxChunkSize = 1000,
  overlap = 200
): TextChunk[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];

  // If text fits in a single chunk, return as-is
  if (cleaned.length <= maxChunkSize) {
    return [{ index: 0, text: cleaned }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    let end = start + maxChunkSize;

    // Try to break at a natural boundary (paragraph, sentence, or word)
    if (end < cleaned.length) {
      // Look for paragraph break
      const paragraphBreak = cleaned.lastIndexOf('\n\n', end);
      if (paragraphBreak > start + maxChunkSize * 0.3) {
        end = paragraphBreak;
      } else {
        // Look for sentence break
        const sentenceBreak = Math.max(
          cleaned.lastIndexOf('. ', end),
          cleaned.lastIndexOf('? ', end),
          cleaned.lastIndexOf('! ', end),
          cleaned.lastIndexOf('\n', end)
        );
        if (sentenceBreak > start + maxChunkSize * 0.3) {
          end = sentenceBreak + 1; // include the period
        } else {
          // Fall back to word break
          const wordBreak = cleaned.lastIndexOf(' ', end);
          if (wordBreak > start) {
            end = wordBreak;
          }
        }
      }
    } else {
      end = cleaned.length;
    }

    const chunkText = cleaned.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({ index, text: chunkText });
      index++;
    }

    // Move start forward, accounting for overlap
    start = end - overlap;
    if (start >= cleaned.length) break;
    // Avoid infinite loop
    if (start <= (chunks[chunks.length - 1]?.index ?? -1)) {
      start = end;
    }
  }

  return chunks;
}
