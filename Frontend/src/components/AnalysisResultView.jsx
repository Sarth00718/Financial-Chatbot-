
/**
 * AnalysisResultView.jsx
 *
 * Renders a normalized analysis result (see analysisResult.js) as a proper
 * UI instead of a raw JSON dump. Structure, top to bottom:
 *
 *   1. Source strip      — confidence + which pages/docs were used
 *   2. Executive summary — pulled from insights.executive_summary, not
 *                           re-derived from the markdown body
 *   3. Key findings       — insights.key_findings as a card grid
 *   4. Visualizations     — one chart per entry in `visualizations`,
 *                           type-aware (bar vs line), via recharts
 *   5. Full narrative     — the markdown `answer`, rendered as markdown
 *
 * Each section only renders if it has data, so a sparse analysis type
 * (e.g. one that returns only `answer`) still looks intentional rather than
 * leaving empty boxes.
 */

import { Fragment } from 'react';
import { Box, Typography, Chip, Stack, Divider } from '@mui/material';
import {
  VerifiedOutlined,
  DescriptionOutlined,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { normalizeAnalysisResult, formatMetricNumber } from '../utils/analysisResult';

const CONFIDENCE_COLOR = {
  high: '#059669',
  medium: '#d97706',
  low: '#dc2626',
};

const CHART_PALETTE = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

// ─── Source strip ─────────────────────────────────────────────────────────

const SourceStrip = ({ documents, accentColor }) => {
  const { confidence_score, pages_used, referenced_documents } = documents;
  if (!confidence_score && pages_used.length === 0 && referenced_documents.length === 0) return null;

  const confidenceColor = CONFIDENCE_COLOR[confidence_score?.toLowerCase()] || 'text.secondary';

  return (
    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 2.5 }}>
      {confidence_score && (
        <Chip
          icon={<VerifiedOutlined sx={{ fontSize: 14 }} />}
          label={`${confidence_score} confidence`}
          size="small"
          sx={{
            height: 24,
            fontSize: '0.7rem',
            fontWeight: 700,
            color: confidenceColor,
            bgcolor: `${confidenceColor}14`,
            '& .MuiChip-icon': { color: confidenceColor },
          }}
        />
      )}
      {pages_used.length > 0 && (
        <Chip
          icon={<DescriptionOutlined sx={{ fontSize: 14 }} />}
          label={pages_used.join(', ')}
          size="small"
          variant="outlined"
          sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600, borderColor: 'divider' }}
        />
      )}
      {referenced_documents.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          from {referenced_documents.join(', ')}
        </Typography>
      )}
    </Stack>
  );
};

// ─── Executive summary ────────────────────────────────────────────────────

const ExecutiveSummaryCard = ({ text, accentColor }) => {
  if (!text) return null;
  return (
    <Box
      sx={{
        borderRadius: 2.5,
        p: 2,
        mb: 2.5,
        bgcolor: `${accentColor}0c`,
        borderLeft: '3px solid',
        borderColor: accentColor,
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, letterSpacing: 0.4, color: accentColor, textTransform: 'uppercase', fontSize: '0.6875rem' }}
      >
        At a glance
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.6, color: 'text.primary' }}>
        {text}
      </Typography>
    </Box>
  );
};

// ─── Key findings grid ────────────────────────────────────────────────────

const KeyFindingsGrid = ({ findings, accentColor }) => {
  if (!findings || findings.length === 0) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <SectionLabel text="Key findings" />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(220px, 1fr))' },
          gap: 1.25,
        }}
      >
        {findings.map((finding, i) => (
          <Box
            key={i}
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" alignItems="flex-start" gap={1}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: accentColor,
                  mt: 0.7,
                  flexShrink: 0,
                }}
              />
              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                  {finding.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: 'block', mt: 0.25 }}>
                  {finding.description}
                </Typography>
              </Box>
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Small section label ──────────────────────────────────────────────────

const SectionLabel = ({ text }) => (
  <Typography
    variant="caption"
    sx={{
      display: 'block',
      fontWeight: 700,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      fontSize: '0.6875rem',
      color: 'text.secondary',
      mb: 1,
    }}
  >
    {text}
  </Typography>
);

// ─── Single chart ─────────────────────────────────────────────────────────

const VisualizationChart = ({ viz, colorOffset = 0 }) => {
  const data = (viz.xAxis || []).map((label, i) => {
    const point = { label };
    (viz.series || []).forEach((s) => {
      point[s.name] = s.data?.[i];
    });
    return point;
  });

  const isLine = viz.type === 'line';
  const seriesNames = (viz.series || []).map((s) => s.name);

  // Quick trend signal for the card header: compare first vs last value of
  // the primary series, purely as a visual cue, not a claim.
  const primarySeries = viz.series?.[0]?.data || [];
  const trendUp = primarySeries.length >= 2 && primarySeries[primarySeries.length - 1] >= primarySeries[0];

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="body2" fontWeight={700}>
          {viz.title}
        </Typography>
        {primarySeries.length >= 2 && (
          trendUp
            ? <TrendingUp sx={{ fontSize: 16, color: '#059669' }} />
            : <TrendingDown sx={{ fontSize: 16, color: '#dc2626' }} />
        )}
      </Stack>

      <Box sx={{ width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          {isLine ? (
            <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="rgba(148,163,184,0.5)" />
              <YAxis tick={{ fontSize: 11 }} stroke="rgba(148,163,184,0.5)" width={42} />
              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              {seriesNames.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {seriesNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={CHART_PALETTE[(i + colorOffset) % CHART_PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="rgba(148,163,184,0.5)" />
              <YAxis tick={{ fontSize: 11 }} stroke="rgba(148,163,184,0.5)" width={42} />
              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              {seriesNames.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {seriesNames.map((name, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  fill={CHART_PALETTE[(i + colorOffset) % CHART_PALETTE.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

const VisualizationsGrid = ({ visualizations }) => {
  if (!visualizations || visualizations.length === 0) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <SectionLabel text="Visualized trends" />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: visualizations.length > 1 ? '1fr 1fr' : '1fr' }, gap: 1.5 }}>
        {visualizations.map((viz, i) => (
          <VisualizationChart key={viz.title || i} viz={viz} colorOffset={i} />
        ))}
      </Box>
    </Box>
  );
};

// ─── Tag rows (entities, keywords, companies, dates) ─────────────────────

const TagRow = ({ label, values }) => {
  if (!values || values.length === 0) return null;
  return (
    <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>
        {label}:
      </Typography>
      {values.map((v, i) => (
        <Chip key={i} label={v} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6875rem', borderColor: 'divider' }} />
      ))}
    </Stack>
  );
};

const GeneralMetaBlock = ({ general }) => {
  const hasAny = [general.entities, general.companies, general.dates, general.keywords].some((arr) => arr.length > 0);
  if (!hasAny) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <TagRow label="Companies" values={general.companies} />
      <TagRow label="Entities" values={general.entities} />
      <TagRow label="Dates referenced" values={general.dates} />
      <TagRow label="Topics" values={general.keywords} />
    </Box>
  );
};

// ─── Narrative (markdown) ─────────────────────────────────────────────────

const NarrativeBody = ({ markdown }) => {
  if (!markdown) return null;
  return (
    <Box>
      <SectionLabel text="Full analysis" />
      <Box
        className="prose-chat"
        sx={{
          fontSize: '0.875rem',
          lineHeight: 1.7,
          '& h1, & h2, & h3': { fontWeight: 700, mt: 2, mb: 0.75, fontSize: '0.95rem' },
          '& h1:first-of-type, & h2:first-of-type, & h3:first-of-type': { mt: 0 },
          '& p': { mb: 1 },
          '& ul, & ol': { pl: 2.5, mb: 1 },
          '& li': { mb: 0.4 },
          '& strong': { fontWeight: 700 },
          '& code': {
            fontFamily: 'monospace',
            fontSize: '0.85em',
            bgcolor: 'action.hover',
            px: 0.5,
            borderRadius: 0.5,
          },
        }}
      >
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </Box>
    </Box>
  );
};

// ─── Main export ───────────────────────────────────────────────────────────

/**
 * @param {object|string} result   raw value from the API (see analysisResult.js)
 * @param {string} accentColor     the analysis type's brand color, for cohesion with the launcher chip/icon
 */
const AnalysisResultView = ({ result, accentColor = '#2563eb' }) => {
  const data = normalizeAnalysisResult(result);

  const isEmpty =
    !data.answer &&
    !data.insights.executive_summary &&
    data.insights.key_findings.length === 0 &&
    data.visualizations.length === 0;

  if (isEmpty) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        No analysis content was returned.
      </Typography>
    );
  }

  return (
    <Box>
      <SourceStrip documents={data.documents} accentColor={accentColor} />
      <ExecutiveSummaryCard text={data.insights.executive_summary} accentColor={accentColor} />
      <KeyFindingsGrid findings={data.insights.key_findings} accentColor={accentColor} />
      <VisualizationsGrid visualizations={data.visualizations} />
      <GeneralMetaBlock general={data.general} />
      {(data.insights.executive_summary || data.insights.key_findings.length > 0) && <Divider sx={{ my: 2.5 }} />}
      <NarrativeBody markdown={data.answer} />
    </Box>
  );
};

export default AnalysisResultView;