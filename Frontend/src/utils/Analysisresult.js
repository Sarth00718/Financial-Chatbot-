/**
 * analysisResult.js
 *
 * The enterprise-analysis API is inconsistent about what `result` actually
 * is by the time it reaches the component:
 *   - sometimes `response.data.data` is already a parsed object
 *   - sometimes it's a JSON-encoded *string* (the whole
 *     { answer, documents, insights, general, visualizations } payload,
 *     stringified) sitting in `result.answer` or as `result` itself
 *   - `answer` itself is markdown text, never JSON
 *
 * The previous UI just did <ReactMarkdown>{result.answer}</ReactMarkdown>,
 * which is why a JSON-stringified payload rendered as a wall of raw text —
 * ReactMarkdown has no JSON awareness, it just prints what it's given.
 *
 * normalizeAnalysisResult() is the single place that untangles this. It
 * always returns a clean, predictable shape:
 *   {
 *     answer: string,                 // pure markdown prose, never JSON
 *     documents: { referenced_documents, pages_used, matching_text, confidence_score },
 *     insights: { executive_summary, key_findings: [{title, description}] },
 *     general: { entities, dates, companies, currency, keywords },
 *     visualizations: [{ title, type, xAxis, series }],
 *   }
 * Every field defaults to an empty-but-safe value so the view never has to
 * guess about undefined.
 */

const EMPTY_RESULT = {
  answer: '',
  documents: { referenced_documents: [], pages_used: [], matching_text: [], confidence_score: null },
  insights: { executive_summary: '', key_findings: [] },
  general: { entities: [], dates: [], companies: [], currency: [], keywords: [] },
  visualizations: [],
};

/** Try to JSON.parse a string; return null instead of throwing. */
const tryParseJSON = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

/**
 * `answer` is sometimes itself a string containing the *entire* payload
 * JSON-encoded (this is the bug in the screenshot). If so, unwrap it and
 * merge its fields in as the source of truth.
 */
const unwrapNestedPayload = (raw) => {
  const nested = tryParseJSON(raw.answer);
  if (nested && typeof nested === 'object') {
    return { ...raw, ...nested, answer: nested.answer ?? '' };
  }
  return raw;
};

export const normalizeAnalysisResult = (input) => {
  if (!input) return EMPTY_RESULT;

  // Whole thing might arrive as a JSON string.
  let raw = typeof input === 'string' ? tryParseJSON(input) ?? { answer: input } : input;
  raw = unwrapNestedPayload(raw);

  return {
    analysisType: raw.analysisType,
    metadata: raw.metadata,
    answer: typeof raw.answer === 'string' ? raw.answer : '',
    documents: {
      referenced_documents: raw.documents?.referenced_documents ?? [],
      pages_used: raw.documents?.pages_used ?? [],
      matching_text: raw.documents?.matching_text ?? [],
      confidence_score: raw.documents?.confidence_score ?? null,
    },
    insights: {
      executive_summary: raw.insights?.executive_summary ?? '',
      key_findings: Array.isArray(raw.insights?.key_findings) ? raw.insights.key_findings : [],
    },
    general: {
      entities: raw.general?.entities ?? [],
      dates: raw.general?.dates ?? [],
      companies: raw.general?.companies ?? [],
      currency: raw.general?.currency ?? [],
      keywords: raw.general?.keywords ?? [],
    },
    visualizations: Array.isArray(raw.visualizations) ? raw.visualizations : [],
  };
};

/** Pull the first currency code found, default to a plain number format. */
export const formatMetricNumber = (value, currency) => {
  if (typeof value !== 'number') return String(value);
  const abs = Math.abs(value);
  const suffix = abs >= 1_000 ? ' M' : ''; // values in this domain arrive pre-scaled to millions
  const formatted = abs >= 1000 ? value.toLocaleString('en-IN', { maximumFractionDigits: 1 }) : value.toString();
  const symbol = currency === 'INR' ? '₹' : currency ? `${currency} ` : '';
  return `${symbol}${formatted}${suffix}`;
};