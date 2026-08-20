/**
 * Lightweight lexicon-based sentiment scorer for reputation guardrails.
 * Deterministic and free — runs on every inbound message with no extra
 * LLM round-trip. Swappable for a model-based scorer later without
 * changing the calling contract.
 */

export type SentimentLabel = 'positive' | 'neutral' | 'negative' | 'angry';

export interface SentimentResult {
  score: number; // -1 (very negative) to 1 (very positive)
  label: SentimentLabel;
}

const ANGRY_WORDS = [
  'scam', 'fraud', 'stupid', 'terrible', 'worst', 'furious', 'disgusted',
  'unacceptable', 'ridiculous', 'trash', 'garbage', 'hate', 'sue', 'lawyer',
  'never again', 'rip off', 'ripoff',
];
const NEGATIVE_WORDS = [
  'bad', 'poor', 'slow', 'late', 'disappointed', 'frustrated', 'annoyed',
  'issue', 'problem', 'broken', 'not working', 'wrong', 'delay', 'delayed',
  'complain', 'complaint', 'upset', 'refund',
];
const POSITIVE_WORDS = [
  'thank', 'thanks', 'great', 'good', 'love', 'awesome', 'excellent',
  'amazing', 'happy', 'perfect', 'appreciate', 'fantastic',
];

export function analyzeSentiment(text: string): SentimentResult {
  const lower = text.toLowerCase();
  let score = 0;
  let angryHits = 0;

  for (const word of ANGRY_WORDS) if (lower.includes(word)) { score -= 0.35; angryHits += 1; }
  for (const word of NEGATIVE_WORDS) if (lower.includes(word)) score -= 0.15;
  for (const word of POSITIVE_WORDS) if (lower.includes(word)) score += 0.2;

  const exclamations = (text.match(/!/g) ?? []).length;
  if (exclamations >= 3) score -= 0.1;

  const shoutedWords = text.split(/\s+/).filter((w) => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w));
  if (shoutedWords.length >= 2) score -= 0.15;

  score = Math.max(-1, Math.min(1, score));

  let label: SentimentLabel = 'neutral';
  if (angryHits > 0 || score <= -0.5) label = 'angry';
  else if (score < -0.1) label = 'negative';
  else if (score > 0.15) label = 'positive';

  return { score: Number(score.toFixed(2)), label };
}
