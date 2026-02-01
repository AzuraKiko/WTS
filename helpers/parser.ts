type LabelMap = Record<string, string[]>;

// Normalize OCR text for matching (strip accents, collapse spaces, lowercase).
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Precomputed token representation to avoid repeated normalization.
type Token = {
  raw: string;
  normalized: string;
  hasNumber: boolean;
};

type NumberPick = {
  value: string;
  endIndex: number;
};

// Build tokens with normalized text and quick numeric hint.
function buildTokens(texts: string[]): Token[] {
  return texts.map(text => ({
    raw: text,
    normalized: normalizeText(text),
    hasNumber: /\d/.test(text)
  }));
}

// Strip non-numeric noise while keeping separators.
function cleanNumberToken(text: string): string {
  if (!text) return '';
  const normalized = text.replace(/[Oo]/g, '0');
  return normalized.replace(/[^0-9,.\-]/g, '');
}

// Extract the last numeric fragment from a line of text.
function extractNumericFromString(text: string): string {
  if (!text) return '';
  const normalized = text.replace(/[Oo]/g, '0');
  const matches = normalized.match(/-?\d+(?:[.,]\d+)*(?:[.,]\d+)?/g);
  if (!matches || matches.length === 0) return '';
  return matches[matches.length - 1];
}

function isIndexToken(text: string): boolean {
  return /^\d+(?:\.\d+)*\.$/.test(text.trim());
}

function shouldJoinThousands(left: string, right: string): boolean {
  if (!/^\d{1,3}$/.test(left)) return false;
  if (!/^\d{3}$/.test(right)) return false;
  if (left.includes(',') || left.includes('.') || right.includes(',') || right.includes('.')) {
    return false;
  }
  return true;
}

function combineNumberTokens(tokens: Token[], index: number): NumberPick | null {
  const current = tokens[index];
  if (!current?.hasNumber) return null;

  const cleaned = cleanNumberToken(current.raw);
  if (!cleaned) return null;

  const next = tokens[index + 1];
  if (next?.hasNumber) {
    const nextCleaned = cleanNumberToken(next.raw);
    if (nextCleaned && shouldJoinThousands(cleaned, nextCleaned)) {
      return { value: `${cleaned},${nextCleaned}`, endIndex: index + 1 };
    }
  }

  return { value: cleaned, endIndex: index };
}

// Find first index where label tokens match exactly in sequence.
function findLabelTokenIndex(
  normalizedTokens: string[],
  labelTokens: string[]
): number | undefined {
  if (!labelTokens.length) return undefined;

  for (let i = 0; i <= normalizedTokens.length - labelTokens.length; i++) {
    let matched = true;
    for (let j = 0; j < labelTokens.length; j++) {
      if (normalizedTokens[i + j] !== labelTokens[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return i;
  }

  return undefined;
}

// Match label by substring (best effort when labels are intact).
function findLineByLabels(tokens: Token[], normalizedLabels: string[]): string {
  if (!tokens.length) return '';

  for (const label of normalizedLabels) {
    const match = tokens.find(item => item.normalized.includes(label));
    if (match) return match.raw;
  }

  return '';
}

// After matching label tokens, return the next token with digits,
// or the next non-empty token if digits are not found.
function findValueAfterLabelTokens(
  tokens: Token[],
  labelTokensList: string[][]
): string {
  if (!tokens.length) return '';

  const normalizedTokens = tokens.map(token => token.normalized);

  for (const labelTokens of labelTokensList) {
    const index = findLabelTokenIndex(normalizedTokens, labelTokens);
    if (index === undefined) continue;

    for (let k = index + labelTokens.length; k < tokens.length; k++) {
      if (!tokens[k].hasNumber) continue;
      if (isIndexToken(tokens[k].raw)) continue;
      const combined = combineNumberTokens(tokens, k);
      if (combined?.value) return combined.value;
    }

    for (let k = index + labelTokens.length; k < tokens.length; k++) {
      if (tokens[k].raw) return tokens[k].raw;
    }
  }

  return '';
}

// Map labels to the next numeric token by visual order.
// This helps when OCR returns label tokens split across words.
function findValuesByLabelOrder(
  tokens: Token[],
  labelMap: LabelMap
): Record<string, string> {
  const normalizedTokens = tokens.map(token => token.normalized);

  const labelHits: Array<{ key: string; index: number }> = [];
  for (const [key, labels] of Object.entries(labelMap)) {
    for (const label of labels) {
      const labelTokens = normalizeText(label).split(' ').filter(Boolean);
      const index = findLabelTokenIndex(normalizedTokens, labelTokens);
      if (index !== undefined) {
        labelHits.push({ key, index });
        break;
      }
    }
  }

  if (!labelHits.length) return {};

  labelHits.sort((a, b) => a.index - b.index);

  const result: Record<string, string> = {};
  let lastNumberIdx = -1;
  for (const hit of labelHits) {
    for (let k = Math.max(hit.index + 1, lastNumberIdx + 1); k < tokens.length; k++) {
      if (!tokens[k].hasNumber) continue;
      if (isIndexToken(tokens[k].raw)) continue;
      const combined = combineNumberTokens(tokens, k);
      if (!combined?.value) continue;
      result[hit.key] = combined.value;
      lastNumberIdx = combined.endIndex;
      break;
    }
  }

  return result;
}

// Extract raw values per label
export function parseByLabels(
  texts: string[],
  labelMap: LabelMap
): Record<string, string> {
  const result: Record<string, string> = {};
  const tokens = buildTokens(texts);
  const orderedValues = findValuesByLabelOrder(tokens, labelMap);

  for (const [key, labels] of Object.entries(labelMap)) {
    const normalizedLabels = labels.map(normalizeText);
    const labelTokensList = labels.map(label =>
      normalizeText(label).split(' ').filter(Boolean)
    );

    const line = findLineByLabels(tokens, normalizedLabels);
    const valueFromLine = line ? extractNumericFromString(line) : '';
    const valueToken =
      valueFromLine ||
      orderedValues[key] ||
      findValueAfterLabelTokens(tokens, labelTokensList);
    result[key] = valueToken;
  }

  return result;
}

// Count how many labels are detected (substring or token-sequence).
export function countLabelMatches(texts: string[], labelMap: LabelMap): number {
  if (!texts.length) return 0;

  const tokens = buildTokens(texts);
  const normalizedTokens = tokens.map(token => token.normalized);

  let count = 0;
  for (const labels of Object.values(labelMap)) {
    const normalizedLabels = labels.map(normalizeText);
    const matched = normalizedLabels.some(label =>
      tokens.some(item => item.normalized.includes(label))
    );
    if (matched) {
      count += 1;
      continue;
    }

    const tokenMatched = labels.some(label => {
      const labelTokens = normalizeText(label).split(' ').filter(Boolean);
      return findLabelTokenIndex(normalizedTokens, labelTokens) !== undefined;
    });

    if (tokenMatched) count += 1;
  }

  return count;
}

