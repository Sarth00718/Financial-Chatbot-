/**
 * normalizeAnalysisResult.js
 *
 * Normalizes the AI response from any enterprise analysis mode into a
 * clean, consistent shape that AnalysisResultView can render without
 * showing raw JSON or empty states.
 *
 * Handles all 10 analysis types:
 *   executive_summary, financial_ratios, swot_analysis, risk_analysis,
 *   company_comparison, multi_document_comparison, kpi_extraction,
 *   explain_mode, trend_analysis, report_generator
 */

/* ── JSON helpers ────────────────────────────────────────────────────── */

function removeNumericCommas(str) {
  let result = ''; let inString = false; let escape = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escape) { result += char; escape = false; continue; }
    if (char === '\\') { result += char; escape = true; continue; }
    if (char === '"') { inString = !inString; result += char; continue; }
    if (!inString && char === ',') {
      const prev = result[result.length - 1];
      const next = str[i + 1];
      if (/\d/.test(prev) && next && /\d/.test(next)) continue;
    }
    result += char;
  }
  return result;
}

function rescueTruncated(str) {
  let result = str.trimEnd().replace(/,\s*$/, '');
  const stack = []; let inString = false; let escape = false;
  for (let i = 0; i < result.length; i++) {
    const c = result[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']');
    else if (c === '}' || c === ']') stack.pop();
  }
  if (inString) result += '"';
  while (stack.length) result += stack.pop();
  return result || null;
}

function tryParseJSON(str) {
  if (typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try { return JSON.parse(trimmed); } catch { /* */ }
  const cleaned = removeNumericCommas(trimmed);
  try { return JSON.parse(cleaned); } catch { /* */ }
  try {
    const rescued = rescueTruncated(cleaned.length < trimmed.length ? cleaned : trimmed);
    if (rescued) return JSON.parse(rescued);
  } catch { /* */ }
  return null;
}

function extractJsonSegment(text) {
  if (typeof text !== 'string') return null;
  const cleaned = text.trim();
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] !== '{' && cleaned[i] !== '[') continue;
    const seg = rescueTruncated(cleaned.slice(i));
    if (!seg) continue;
    const parsed = tryParseJSON(seg);
    if (parsed !== null) return parsed;
  }
  return null;
}

function extractJsonField(text, field) {
  const re = new RegExp(`["'\`]?${field}["'\`]?\\s*:\\s*([\\[{])`, 'i');
  const m = re.exec(text);
  if (!m) return null;
  const startIdx = m.index + m[0].length - 1;
  const open = text[startIdx]; const close = open === '[' ? ']' : '}';
  let depth = 0; let inStr = false; let esc = false;
  for (let i = startIdx; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return text.slice(startIdx, i + 1); }
  }
  return null;
}

/* ── Prose parsers ───────────────────────────────────────────────────── */

/**
 * Parse risk items from the inline prose format:
 * "Category: Operational Severity: High Source: Page 1 Mitigation: ..."
 * "Risk 1: ... | Category: X | Severity: High | Source: Page 2 | Mitigation: ..."
 * "**Risk**: ... | **Severity**: High | **Category**: X ..."
 */
function parseRisksFromProse(text) {
  if (!text || typeof text !== 'string') return [];
  const risks = [];

  // ── Pattern A: "Risk N: ... Category: ... Severity: ... Source: ... Mitigation: ..." ──
  const blockPattern = /\*{0,2}Risk\s*\d*\*{0,2}[:\s]+(.+?)(?=\*{0,2}Risk\s*\d*\*{0,2}[:\s]|$)/gis;
  let m;
  while ((m = blockPattern.exec(text)) !== null) {
    const block = m[1];
    const title = block.split(/\||\*{0,2}Category\*{0,2}[\s:]/i)[0].trim();
    const catM = /\*{0,2}Category\*{0,2}\s*[:|]\s*([\w\s]+?)(?:\s*[|*\n]|$)/i.exec(block);
    const sevM = /\*{0,2}Severity\*{0,2}\s*[:|]\s*(High|Medium|Low|Critical)/i.exec(block);
    const pageM = /\*{0,2}Source\*{0,2}\s*[:|]\s*(Page\s*[\d\w]+)/i.exec(block);
    const mitM = /\*{0,2}Mitigation\*{0,2}\s*[:|]\s*([^|*\n]+)/i.exec(block);
    if (title && title.length > 3) {
      risks.push({
        title: title.replace(/\*+/g, '').trim(),
        category: catM ? catM[1].trim() : 'Operational',
        severity: sevM ? sevM[1].trim() : 'Low',
        page: pageM ? pageM[1].trim() : '',
        description: '',
        mitigation: mitM ? mitM[1].trim() : '',
      });
    }
  }
  if (risks.length > 0) return risks;

  // ── Pattern B: Inline "Category: X Severity: Y Source: Z Mitigation: W" blocks ──
  // Handles the LLM output: "Category: Operational Severity: High Source: Page 1 Mitigation: ..."
  // Each block starts with "Category:" and ends before the next "Category:"
  const inlineBlockRe = /Category:\s*([\w\s]+?)\s+Severity:\s*(High|Medium|Low|Critical)\s+Source:\s*(Page\s*[\d\w]+)\s+Mitigation:\s*([^.]+\.?)/gi;
  while ((m = inlineBlockRe.exec(text)) !== null) {
    const mitigation = m[4].trim();
    // Derive a title from the mitigation text (first meaningful phrase)
    const titleFromMit = mitigation
      .replace(/^implement\s+/i, '')
      .replace(/\s+to\s+.*/i, '')
      .replace(/\s+and\s+.*/i, '')
      .trim();
    const title = titleFromMit.length > 3 && titleFromMit.length < 60
      ? titleFromMit.charAt(0).toUpperCase() + titleFromMit.slice(1)
      : `${m[1].trim()} Risk`;
    risks.push({
      title,
      category: m[1].trim(),
      severity: m[2].trim(),
      page: m[3].trim(),
      description: '',
      mitigation,
    });
  }
  if (risks.length > 0) return risks;

  // ── Pattern C: Bullet lines with severity ──
  const linePattern = /(?:^|\n)\s*(?:\d+\.|-)\s*\*{0,2}(.+?)\*{0,2}\s*[:|]/gm;
  while ((m = linePattern.exec(text)) !== null) {
    const lineEnd = text.indexOf('\n', m.index + 1);
    const line = text.slice(m.index, lineEnd === -1 ? text.length : lineEnd);
    const sevM = /Severity[:\s]+(High|Medium|Low|Critical)/i.exec(line);
    const catM = /Category[:\s]+([\w\s]+)/i.exec(line);
    const title = m[1].trim();
    if (title.length > 3) {
      risks.push({
        title,
        severity: sevM ? sevM[1].trim() : 'Low',
        category: catM ? catM[1].trim() : 'Operational',
        description: line.replace(/\*+/g, '').trim(),
        mitigation: '', page: '',
      });
    }
  }
  return risks;
}

/**
 * Parse KPIs from prose markdown table or labeled lines.
 * Handles:
 *  "| KPI | Value | Period | ..." markdown tables
 *  "**Revenue**: $100M (FY2024) [Page 3]"
 *  "Revenue: 100 million — FY2024 (Page 3)"
 */
function parseKpisFromProse(text) {
  if (!text || typeof text !== 'string') return [];
  const kpis = [];

  // Parse markdown tables: | KPI/Metric | Value | Period | ...
  const tablePattern = /\|(.+)\|\s*\n\s*\|[-|\s]+\|\s*\n((?:\|.+\|\s*\n?)+)/g;
  let m;
  while ((m = tablePattern.exec(text)) !== null) {
    const headers = m[1].split('|').map(h => h.trim().toLowerCase()).filter(Boolean);
    const rows = m[2].trim().split('\n');
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length === 0) continue;
      const obj = {};
      headers.forEach((h, i) => { if (cells[i]) obj[h] = cells[i]; });
      const nameKey = headers.find(h => /kpi|metric|name|indicator|ratio/.test(h));
      const valKey = headers.find(h => /value|amount|figure|result/.test(h));
      const periodKey = headers.find(h => /period|quarter|year|date|fy/.test(h));
      const pageKey = headers.find(h => /page|source|ref/.test(h));
      if (nameKey && obj[nameKey] && obj[nameKey] !== '---') {
        kpis.push({
          name: obj[nameKey],
          value: valKey ? obj[valKey] || 'N/A' : 'N/A',
          period: periodKey ? obj[periodKey] : undefined,
          page: pageKey ? obj[pageKey] : undefined,
        });
      }
    }
  }
  if (kpis.length > 0) return kpis;

  // Fallback: "**Ratio Name**: Value — Interpretation (Page X)"
  const linePattern = /\*{0,2}([A-Z][A-Za-z\s\/]+?)\*{0,2}\s*:\s*([^\n—–]+?)(?:\s*—\s*([^\n(]+))?(?:\s*\(Page\s*([\d\w]+)\))?(?:\n|$)/gm;
  while ((m = linePattern.exec(text)) !== null) {
    const name = m[1].trim();
    const value = m[2].trim();
    if (name.length > 2 && name.length < 60 && value.length > 0) {
      kpis.push({ name, value, description: m[3]?.trim(), page: m[4] ? `Page ${m[4]}` : undefined });
    }
  }
  return kpis;
}

/**
 * Parse trend items from structured insights array.
 * Only used as a fallback when insights are provided but lack direction.
 * We intentionally DO NOT parse prose for trends — it produces too many false positives.
 * The LLM must return structured insights[] with direction fields.
 */
function parseTrendsFromProse(text) {
  // Disabled — prose parsing for trends produces garbage (matches any sentence with a colon).
  // Trend data must come from the structured insights[] array returned by the LLM.
  return [];
}

/** Parse SWOT from prose text */
function parseSwotFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const sections = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
  const sectionPattern = /\*{0,2}(Strengths?|Weaknesses?|Opportunities?|Threats?)\*{0,2}\s*:/gi;
  const matches = [...text.matchAll(sectionPattern)];
  if (matches.length === 0) return null;

  matches.forEach((match, idx) => {
    const sn = match[1].toLowerCase().replace(/s$/, '');
    const key = sn === 'strength' ? 'strengths' : sn === 'weakness' ? 'weaknesses'
      : sn === 'opportunit' ? 'opportunities' : sn === 'threat' ? 'threats' : null;
    if (!key) return;
    const start = match.index + match[0].length;
    const end = matches[idx + 1] ? matches[idx + 1].index : text.length;
    let block = text.slice(start, end).trim();
    const stopM = /(?:\r?\n|^)\s*\*{0,2}(Insights|General|Key Findings|Executive Summary|Documents|Analysis|Findings|Risk|KPI)\*{0,2}\s*[:*]/i.exec(block);
    if (stopM) block = block.slice(0, stopM.index).trim();
    block.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
      const cleaned = line.replace(/^[-•*\d.]\s*/, '').replace(/^\*{0,2}\s*(Insights|General|Key Findings|Executive Summary|Documents)\*{0,2}\s*[:*]?/i, '').trim();
      if (cleaned.length > 4 && !/insufficient data|no items|unable to identify|not enough data/i.test(cleaned)) {
        sections[key].push(cleaned);
      }
    });
  });
  return Object.values(sections).some(a => a.length > 0) ? sections : null;
}

/** Parse visualizations from text */
function parseVisualizationsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const raw = extractJsonField(text, 'visualizations');
  if (raw) { const p = tryParseJSON(raw); if (Array.isArray(p) && p.length > 0) return p; }
  return [];
}

/** Strip raw JSON blobs that leaked into the answer text */
function stripRawJsonFromAnswer(text) {
  if (!text || typeof text !== 'string') return text;

  // If the entire text IS a JSON object (full payload leaked in as answer), return empty
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const parsed = tryParseJSON(trimmed);
    if (parsed && typeof parsed === 'object' && (
      parsed.answer !== undefined || parsed.documents !== undefined ||
      parsed.insights !== undefined || parsed.analysisType !== undefined
    )) {
      // The "answer" text is actually the full JSON payload — extract just the answer
      return typeof parsed.answer === 'string' ? parsed.answer.trim() : '';
    }
  }

  let cleaned = text;

  // Remove "Label { ... }" and "Label [ ... ]" patterns for known JSON section names
  cleaned = cleaned.replace(/\n*\s*\*{0,2}(Documents?|Insights?|General|Visualizations?|Metadata)\*{0,2}\s*(\{[\s\S]{0,4000}?\}|\[[\s\S]{0,2000}?\])\s*/gi, '\n');

  // Remove any trailing raw JSON object/array that starts after the prose content
  // Pattern: text ends with {...} or [...] containing known JSON keys
  cleaned = cleaned.replace(/\n+\{\s*"(?:answer|analysisType|documents|insights|general|visualizations|metadata|citations)"[\s\S]{0,8000}?\}\s*$/s, '');
  cleaned = cleaned.replace(/\n+\[[\s\S]{0,2000}?\]\s*$/, '');

  // Remove inline JSON sections that appear as: , "documents": {...}, "insights": {...}
  cleaned = cleaned.replace(/,?\s*"(documents|insights|general|visualizations|metadata)"\s*:\s*(\{[\s\S]{0,3000}?\}|\[[\s\S]{0,2000}?\])/gi, '');

  // Remove risk prose when it's in "Category: X Severity: Y Source: Z Mitigation: W" format
  // (this is the raw risk template output that wasn't structured into cards)
  cleaned = cleaned.replace(/\s*\*{0,2}Category\*{0,2}:\s*\w+\s*\*{0,2}Severity\*{0,2}:\s*(High|Medium|Low|Critical)\s*\*{0,2}Source\*{0,2}:[^\n]*\*{0,2}Mitigation\*{0,2}:[^\n]*/gi, '');

  return cleaned.trim();
}

/* ── Insight normalizer ──────────────────────────────────────────────── */
function normalizeInsights(rawInsights) {
  if (!rawInsights) return [];
  if (Array.isArray(rawInsights)) return rawInsights.filter(Boolean);
  if (typeof rawInsights === 'object') {
    // Convert dict-style insights to list
    const items = [];
    if (rawInsights.executive_summary && typeof rawInsights.executive_summary === 'string') {
      items.push({ title: 'Executive Summary', description: rawInsights.executive_summary, category: 'Summary' });
    }
    if (Array.isArray(rawInsights.key_findings)) {
      rawInsights.key_findings.forEach(f =>
        items.push({ title: 'Key Finding', description: typeof f === 'string' ? f : JSON.stringify(f), category: 'Finding' })
      );
    }
    if (Array.isArray(rawInsights.financial_ratios)) {
      rawInsights.financial_ratios.forEach(r =>
        items.push({ title: 'Financial Ratio', description: typeof r === 'string' ? r : JSON.stringify(r), category: 'Ratio' })
      );
    }
    if (Array.isArray(rawInsights.risks_and_opportunities)) {
      rawInsights.risks_and_opportunities.forEach(r =>
        items.push({ title: 'Risk/Opportunity', description: typeof r === 'string' ? r : JSON.stringify(r), category: 'Risk' })
      );
    }
    return items;
  }
  return [];
}

function normalizeDocuments(rawDocuments) {
  if (Array.isArray(rawDocuments)) return rawDocuments;
  if (rawDocuments && typeof rawDocuments === 'object') return rawDocuments;
  return [];
}

/* ── Main export ─────────────────────────────────────────────────────── */

export function normalizeAnalysisResult(raw) {
  if (!raw) return null;

  let base = { ...raw };

  /* Step 1: Un-nest if `answer` is itself a JSON blob containing the full payload */
  if (typeof base.answer === 'string') {
    const trimmed = base.answer.trim();
    if (trimmed.startsWith('{')) {
      const nested = tryParseJSON(trimmed) || extractJsonSegment(trimmed);
      if (nested && typeof nested === 'object' && !Array.isArray(nested)
          && (nested.analysisType || nested.insights !== undefined || nested.documents !== undefined)) {
        // Merge nested payload into base, but keep the inner answer text
        let innerAnswer = typeof nested.answer === 'string' ? nested.answer : '';
        // If inner answer is ALSO a JSON blob, extract from it too
        if (innerAnswer.trim().startsWith('{')) {
          const innerParsed = tryParseJSON(innerAnswer.trim());
          if (innerParsed && typeof innerParsed.answer === 'string') {
            innerAnswer = innerParsed.answer;
          } else {
            innerAnswer = '';
          }
        }
        base = {
          ...raw,
          ...nested,
          answer: innerAnswer,
          metadata: nested.metadata ?? raw.metadata,
          citations: nested.citations ?? raw.citations,
          analysisType: nested.analysisType ?? raw.analysisType,
        };
      }
    }
  }

  const answerText = typeof base.answer === 'string' ? base.answer : '';
  let analysisType = (base.analysisType || '').toLowerCase().trim() || null;

  /* Step 2: Normalize insights first */
  let insights = normalizeInsights(base.insights);

  /* Step 3: Visualizations */
  let visualizations = Array.isArray(base.visualizations) ? base.visualizations : [];
  if (visualizations.length === 0) {
    const fromText = parseVisualizationsFromText(answerText);
    if (fromText.length > 0) visualizations = fromText;
  }

  /* Step 4: SWOT from general or answer text */
  let general = base.general || null;
  // If general has SWOT fields, use directly
  const hasSWOTInGeneral = general && (general.strengths || general.weaknesses || general.opportunities || general.threats);
  let swot = hasSWOTInGeneral
    ? { strengths: general.strengths || [], weaknesses: general.weaknesses || [],
        opportunities: general.opportunities || [], threats: general.threats || [] }
    : null;

  // Try to parse SWOT from answer prose if not already in general
  if (!swot || !Object.values(swot).some(a => a.length > 0)) {
    const parsedSwot = parseSwotFromText(answerText);
    if (parsedSwot) swot = parsedSwot;
  }

  // Merge swot into general if not already there
  if (swot && general && !hasSWOTInGeneral) {
    general = { ...general, ...swot };
  } else if (swot && !general) {
    general = swot;
  }

  /* Step 5: Mode-specific insight parsing from prose when insights array is empty */

  // Risk analysis: parse from prose if no structured risks
  const hasStructuredRisks = insights.some(i => i?.severity);
  if ((analysisType === 'risk_analysis' || (!analysisType && /\bRisk\s+\d+[:\s]/i.test(answerText))) && !hasStructuredRisks) {
    const parsed = parseRisksFromProse(answerText);
    if (parsed.length > 0) {
      insights = parsed;
      if (!analysisType) analysisType = 'risk_analysis';
    }
  }

  // KPI/financial_ratios: parse from prose if no structured KPIs
  const hasStructuredKpis = insights.some(i => i?.value !== undefined || i?.name);
  if ((analysisType === 'kpi_extraction' || analysisType === 'financial_ratios') && !hasStructuredKpis && insights.length === 0) {
    const parsed = parseKpisFromProse(answerText);
    if (parsed.length > 0) insights = parsed;
  }

  // Trend analysis: only keep insights that actually have a direction field
  // (don't parse from prose — too many false positives)
  if (analysisType === 'trend_analysis') {
    // Filter out any insight items that don't have a real direction value
    const validTrends = insights.filter(i =>
      i && typeof i === 'object' && i.direction &&
      ['increasing', 'decreasing', 'stable', 'volatile', 'up', 'down', 'flat'].includes((i.direction || '').toLowerCase())
    );
    if (validTrends.length > 0) {
      insights = validTrends;
    } else {
      // No valid structured trends — clear insights so prose answer renders instead
      insights = [];
    }
  }

  /* Step 6: Detect analysisType from content clues when missing */
  if (!analysisType && answerText) {
    const lower = answerText.toLowerCase();
    if (lower.includes('swot') || (lower.includes('strength') && lower.includes('weakness'))) {
      analysisType = 'swot_analysis';
    } else if (/\bRisk\s+\d+[:\s]/i.test(answerText)) {
      analysisType = 'risk_analysis';
    } else if (lower.includes('gross margin') || lower.includes('operating margin') || lower.includes('net margin')) {
      analysisType = 'financial_ratios';
    } else if (lower.includes('kpi') || lower.includes('key performance')) {
      analysisType = 'kpi_extraction';
    } else if (lower.includes('trend') && lower.includes('quarter')) {
      analysisType = 'trend_analysis';
    } else if (lower.includes('company overview') && lower.includes('financial highlights')) {
      analysisType = 'executive_summary';
    }
  }

  /* Step 7: Clean the answer text */
  let cleanAnswer = answerText;
  // If answer starts with { it's a full JSON payload — extract just the answer field
  if (cleanAnswer.trim().startsWith('{')) {
    const fullParsed = tryParseJSON(cleanAnswer.trim()) || extractJsonSegment(cleanAnswer.trim());
    if (fullParsed && typeof fullParsed === 'object' && typeof fullParsed.answer === 'string') {
      cleanAnswer = fullParsed.answer;
    }
  }
  // Remove leading JSON artifact
  cleanAnswer = cleanAnswer.replace(/^\{\s*["']?answer["']?\s*:\s*["']/i, '');
  // Strip Visualization blocks
  cleanAnswer = cleanAnswer.replace(/\n+Visualizations?:[\s\S]*$/i, '').trim();
  // Remove SWOT headers (they render as cards)
  if (analysisType === 'swot_analysis' || swot) {
    cleanAnswer = cleanAnswer.replace(/#{1,3}\s*SWOT[^\n]*\n*/gi, '').trim();
  }
  // Strip raw JSON blobs from answer (must run after extracting nested answer)
  cleanAnswer = stripRawJsonFromAnswer(cleanAnswer);

  // For risk_analysis with structured risks: strip ALL raw risk prose from the answer
  if ((analysisType === 'risk_analysis' || insights.some(i => i?.severity)) && insights.length > 0) {
    // Remove "Risk N: ..." lines
    cleanAnswer = cleanAnswer.replace(/(?:^|\n)\s*\*{0,2}Risk\s+\d+\*{0,2}[:\s][^\n]*/gim, '').trim();
    // Remove "Based on the provided context..." preamble
    cleanAnswer = cleanAnswer.replace(/^Based on the provided context[^.]*\.?\s*/i, '').trim();
    cleanAnswer = cleanAnswer.replace(/^The following[^.]*risks[^.]*\.?\s*/i, '').trim();
    // Remove ALL inline "Category: X Severity: Y Source: Z Mitigation: W" prose blocks
    cleanAnswer = cleanAnswer.replace(/(?:Category:\s*\w+\s+)?Severity:\s*(?:High|Medium|Low|Critical)\s+Source:\s*Page\s*\d+\s+Mitigation:\s*[^.]+\./gi, '').trim();
    // Remove the entire block if what remains is only Category/Severity/Source/Mitigation labels
    if (/^[\s,;.]*(?:Category:|Severity:|Source:|Mitigation:)/i.test(cleanAnswer)) {
      cleanAnswer = '';
    }
    cleanAnswer = cleanAnswer.replace(/\n{3,}/g, '\n\n').trim();
  }

  const documents = normalizeDocuments(base.documents);

  return {
    analysisType,
    answer: cleanAnswer,
    documents,
    insights,
    general,
    visualizations,
    metadata: base.metadata || {},
    citations: base.citations || [],
    swot: swot || null,
  };
}

export default normalizeAnalysisResult;
