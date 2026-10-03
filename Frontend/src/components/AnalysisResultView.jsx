/**
 * AnalysisResultView.jsx — Enterprise AI Response Renderer
 * Handles all 10 enterprise analysis modes with proper UI per mode.
 */
import { useMemo, useState } from 'react';
import {
  Box, Typography, Chip, Stack, Paper, Grid, Divider, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, LinearProgress,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, TrendingFlat, ErrorOutline,
  WarningAmber, CheckCircleOutline, InfoOutlined,
  ExpandMore, Lightbulb, Assessment, AutoGraph, Article,
  Shield, FlashOn, Explore, GppBad, TrendingUp as TrendUp,
  Timeline, Description as DescIcon, Psychology,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import normalizeAnalysisResult from '../utils/normalizeAnalysisResult.js';
import DataVisualization from './DataVisualization.jsx';

/* ── Shared primitives ─────────────────────────────────────────────── */

const MarkdownBlock = ({ children }) => (
  <Box sx={{
    '& p': { my: 0.75, lineHeight: 1.7, fontSize: '0.875rem' },
    '& h1,& h2,& h3,& h4': { mt: 1.5, mb: 0.75, fontWeight: 700 },
    '& ul,& ol': { pl: 3, my: 0.5 },
    '& li': { fontSize: '0.875rem', mb: 0.25 },
    '& strong': { fontWeight: 700 },
    '& table': { borderCollapse: 'collapse', width: 'max-content', minWidth: '100%', my: 1.5 },
    '& .table-wrapper': { overflowX: 'auto', width: '100%', display: 'block' },
    '& th': { border: '1px solid', borderColor: 'divider', px: 1.5, py: 0.75, fontSize: '0.8125rem', fontWeight: 700, bgcolor: 'action.hover', textAlign: 'left', whiteSpace: 'nowrap', wordBreak: 'normal', overflowWrap: 'normal' },
    '& td': { border: '1px solid', borderColor: 'divider', px: 1.5, py: 0.5, fontSize: '0.8125rem', wordBreak: 'normal', overflowWrap: 'break-word' },
    '& tr:nth-of-type(even)': { bgcolor: 'action.hover' },
    '& code': { bgcolor: 'action.selected', px: 0.5, borderRadius: 0.5, fontSize: '0.8rem', fontFamily: 'monospace' },
    '& pre': { bgcolor: 'action.selected', p: 1.5, borderRadius: 1.5, overflowX: 'auto', my: 1 },
    '& blockquote': { borderLeft: '3px solid', borderColor: 'primary.main', pl: 2, ml: 0, color: 'text.secondary', my: 1 },
    '& hr': { my: 1.5, borderColor: 'divider' },
  }}>
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ node, ...props }) => (
          <div className="table-wrapper" style={{ overflowX: 'auto', marginBottom: '1.5em' }}>
            <table {...props} />
          </div>
        )
      }}
    >
      {children || ''}
    </ReactMarkdown>
  </Box>
);

const trendIcon = (t) => {
  const v = (t || '').toLowerCase();
  if (v === 'up' || v === 'increasing') return <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />;
  if (v === 'down' || v === 'decreasing') return <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />;
  return <TrendingFlat sx={{ fontSize: 16, color: 'text.disabled' }} />;
};

const severityColor = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'high' || v === 'critical') return 'error';
  if (v === 'medium') return 'warning';
  if (v === 'low') return 'success';
  return 'default';
};

/* ── ExecSummaryBanner ─────────────────────────────────────────────── */
const ExecSummaryBanner = ({ text }) => !text ? null : (
  <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main', bgcolor: t => t.palette.mode === 'dark' ? 'rgba(37,99,235,0.08)' : '#EFF6FF' }}>
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Assessment sx={{ color: 'primary.main', mt: 0.2, flexShrink: 0 }} />
      <Box>
        <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Executive Summary</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.7 }}>{text}</Typography>
      </Box>
    </Stack>
  </Paper>
);

/* ── KeyFindings ───────────────────────────────────────────────────── */
const KeyFindings = ({ items }) => (!items || items.length === 0) ? null : (
  <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
      <Lightbulb sx={{ fontSize: 18, color: '#F59E0B' }} />
      <Typography variant="subtitle2" fontWeight={700}>Key Findings</Typography>
    </Stack>
    <Stack spacing={0.75}>
      {items.map((item, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
          <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.1 }}>{i + 1}</Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {typeof item === 'string' ? item : item.description || item.text || JSON.stringify(item)}
          </Typography>
        </Stack>
      ))}
    </Stack>
  </Paper>
);

/* ── SwotCard ──────────────────────────────────────────────────────── */
const SwotCard = ({ title, items, color, Icon }) => (
  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', borderTop: `3px solid ${color}`, '&:hover': { boxShadow: `0 4px 20px ${color}22` }, transition: 'box-shadow 0.2s' }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
      <Icon sx={{ fontSize: 18, color }} />
      <Typography variant="subtitle2" fontWeight={700} sx={{ color }}>{title}</Typography>
      <Chip label={items?.length || 0} size="small" sx={{ ml: 'auto', height: 18, fontSize: '0.65rem', bgcolor: `${color}18`, color }} />
    </Stack>
    <Stack component="ul" sx={{ pl: 2, m: 0 }} spacing={0.75}>
      {(items || []).map((it, i) => (
        <Typography key={i} component="li" variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {typeof it === 'string' ? it : it.text || it.description || ''}
        </Typography>
      ))}
      {(!items || items.length === 0) && <Typography variant="caption" color="text.disabled">No items identified</Typography>}
    </Stack>
  </Paper>
);

/* ── KpiCard ───────────────────────────────────────────────────────── */
const KpiCard = ({ item, accentColor }) => {
  const label = item.label || item.name || item.metric || item.kpi || 'Metric';
  const value = item.value ?? item.amount ?? item.figure ?? item.result ?? '—';
  const period = item.period || item.quarter || item.date || item.year;
  const change = item.change || item.delta || item.growth;
  const source = item.page || item.source;
  const desc = item.description || item.interpretation;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderLeft: '3px solid', borderLeftColor: accentColor, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ lineHeight: 1.3 }}>
          {label}{period ? ` · ${period}` : ''}
        </Typography>
        {item.trend && trendIcon(item.trend)}
      </Stack>
      <Typography variant="h6" fontWeight={700} sx={{ mt: 0.25, fontSize: '1rem' }}>{String(value)}</Typography>
      {desc && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}>{desc}</Typography>}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.25 }}>
        {change != null && (
          <Typography variant="caption" fontWeight={600} color={String(change).startsWith('-') ? 'error.main' : 'success.main'}>{change}</Typography>
        )}
        {source && <Typography variant="caption" color="text.disabled">{source}</Typography>}
      </Stack>
    </Paper>
  );
};

/* ── RiskRow ───────────────────────────────────────────────────────── */
const RiskRow = ({ item }) => (
  <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, mb: 1.25 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75, flexWrap: 'wrap', gap: 0.75 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
        {item.title || item.risk || item.name || 'Risk'}
      </Typography>
      <Stack direction="row" spacing={0.75} flexShrink={0}>
        {item.category && <Chip label={item.category} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />}
        <Chip
          icon={(item.severity || '').toLowerCase() === 'high' || (item.severity || '').toLowerCase() === 'critical' ? <ErrorOutline fontSize="small" /> : (item.severity || '').toLowerCase() === 'medium' ? <WarningAmber fontSize="small" /> : <CheckCircleOutline fontSize="small" />}
          label={item.severity || 'Low'} size="small" color={severityColor(item.severity)} variant="outlined"
          sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
        />
      </Stack>
    </Stack>
    {(item.description || item.text) && (item.description || item.text) !== (item.title || item.risk || item.name) && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: item.mitigation ? 0.75 : 0 }}>
        {item.description || item.text}
      </Typography>
    )}
    {item.mitigation && (
      <Box sx={{ mt: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 1.5 }}>
        <Typography variant="caption" color="success.main" fontWeight={700}>Mitigation: </Typography>
        <Typography variant="caption" color="text.secondary">{item.mitigation}</Typography>
      </Box>
    )}
    {item.page && <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>Source: {item.page}</Typography>}
    {item.impact && <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>Impact: {item.impact}</Typography>}
  </Paper>
);

/* ── TrendCard ─────────────────────────────────────────────────────── */
const TrendCard = ({ item, accentColor }) => {
  const dir = (item.direction || '').toLowerCase();
  const isUp = dir.includes('increas') || dir === 'up';
  const isDown = dir.includes('decreas') || dir === 'down';
  const color = isUp ? '#059669' : isDown ? '#DC2626' : '#64748B';
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 1, borderLeft: `3px solid ${color}` }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>{item.name || item.title || 'Trend'}</Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {item.change && <Chip label={item.change} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: `${color}18`, color, fontWeight: 700 }} />}
          {item.direction && trendIcon(item.direction)}
        </Stack>
      </Stack>
      {item.description && <Typography variant="body2" color="text.secondary">{item.description}</Typography>}
      {item.page && <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>Source: {item.page}</Typography>}
    </Paper>
  );
};

/* ── ComparisonTable ───────────────────────────────────────────────── */
const ComparisonTable = ({ rows, accentColor }) => {
  if (!rows?.length) return null;
  const first = rows.find(r => r && typeof r === 'object');
  if (!first) return null;
  const columns = Object.keys(first);
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 1.5 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: `${accentColor}12` }}>
            {columns.map(col => (
              <TableCell key={col} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {col.replace(/_/g, ' ')}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}>
              {columns.map(col => (
                <TableCell key={col} sx={{ fontSize: '0.8125rem' }}>{String(row[col] ?? '—')}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

/* ── DocumentsPanel (shown in Documents tab) ───────────────────────── */
const DocumentsPanel = ({ docs }) => {
  if (!docs) return null;
  const LABEL_MAP = { referenced_documents: 'Referenced Documents', pages_used: 'Pages Used', matching_text: 'Matching Text', confidence_score: 'Confidence Score' };
  const CONF_COLOR = { High: 'success', Medium: 'warning', Low: 'error' };
  const entries = Object.entries(docs).filter(([, v]) => {
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === 'string' && v.trim().length > 0;
  });
  if (entries.length === 0) return null;
  return (
    <Stack spacing={1.5}>
      {entries.map(([k, v]) => {
        const label = LABEL_MAP[k] || k.replace(/_/g, ' ');
        if (k === 'confidence_score') {
          return (
            <Stack key={k} direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 130 }}>{label}:</Typography>
              <Chip label={v} size="small" color={CONF_COLOR[v] || 'default'} variant="outlined" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
            </Stack>
          );
        }
        const items = Array.isArray(v) ? v : [v];
        return (
          <Box key={k}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
              {items.map((item, i) => (
                <Chip key={i} label={String(item)} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.72rem' }} />
              ))}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
};

/* ── GeneralPanel (keyword/entity chips, collapsed) ────────────────── */
const GeneralPanel = ({ data }) => {
  if (!data) return null;
  const SWOT_KEYS = new Set(['strengths', 'weaknesses', 'opportunities', 'threats']);
  const entries = Object.entries(data).filter(([k, v]) => {
    if (SWOT_KEYS.has(k)) return false;
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === 'string' && v.trim().length > 0;
  });
  if (entries.length === 0) return null;
  return (
    <Stack spacing={1.5}>
      {entries.map(([k, v]) => {
        const items = Array.isArray(v) ? v : [String(v)];
        return (
          <Box key={k}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>{k.replace(/_/g, ' ')}</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
              {items.map((item, i) => <Chip key={i} label={String(item)} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.72rem' }} />)}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   SWOT config
   ══════════════════════════════════════════════════════════════════════ */
const SWOT_CONFIG = [
  { key: 'strengths',    title: 'Strengths',    color: '#059669', Icon: CheckCircleOutline },
  { key: 'weaknesses',   title: 'Weaknesses',   color: '#DC2626', Icon: GppBad },
  { key: 'opportunities',title: 'Opportunities',color: '#2563EB', Icon: Explore },
  { key: 'threats',      title: 'Threats',      color: '#D97706', Icon: Shield },
];

/* ── Mode header config ────────────────────────────────────────────── */
const MODE_META = {
  executive_summary:         { label: 'Executive Summary',     icon: Assessment,    color: '#2563eb' },
  financial_ratios:          { label: 'Financial Ratios',       icon: Assessment,    color: '#7c3aed' },
  swot_analysis:             { label: 'SWOT Analysis',          icon: Psychology,    color: '#059669' },
  risk_analysis:             { label: 'Risk Assessment',        icon: WarningAmber,  color: '#dc2626' },
  company_comparison:        { label: 'Company Comparison',     icon: DescIcon,      color: '#0891b2' },
  multi_document_comparison: { label: 'Multi-Doc Comparison',   icon: DescIcon,      color: '#6366f1' },
  kpi_extraction:            { label: 'Financial KPIs',         icon: Assessment,    color: '#d97706' },
  trend_analysis:            { label: 'Trend Analysis',         icon: Timeline,      color: '#10b981' },
  explain_mode:              { label: 'AI Explanation',         icon: Lightbulb,     color: '#f59e0b' },
  report_generator:          { label: 'Analysis Report',        icon: Article,       color: '#4f46e5' },
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
const AnalysisResultView = ({ result, accentColor = '#2563eb' }) => {
  const data = useMemo(() => normalizeAnalysisResult(result), [result]);
  const [tab, setTab] = useState(0);

  if (!data) return <Typography color="text.disabled">No result to display.</Typography>;

  const { analysisType, answer, documents, insights, general, visualizations, swot, metadata } = data;

  /* ── Derived flags ───────────────────────────────────────────────── */
  const modeMeta = MODE_META[analysisType] || null;
  const modeColor = modeMeta?.color || accentColor;

  const swotData = swot || (general && (general.strengths || general.weaknesses) ? general : null);
  const hasSwot = Boolean(swotData && SWOT_CONFIG.some(c => swotData[c.key]?.length > 0));

  const insightItems = Array.isArray(insights) ? insights : [];

  // Risk
  const hasRiskItems = insightItems.some(i => i?.severity);
  const hasRisks = (analysisType === 'risk_analysis' || hasRiskItems) && insightItems.length > 0;

  // KPI / financial ratios
  const hasKpiItems = insightItems.some(i => i && (i.value !== undefined || i.amount !== undefined || i.name));
  const isKpiMode = analysisType === 'kpi_extraction' || analysisType === 'financial_ratios';
  const hasKpis = isKpiMode && hasKpiItems;

  // Trend — only real trend items with a direction field
  const validTrendItems = insightItems.filter(i =>
    i && typeof i === 'object' && i.direction &&
    ['increasing', 'decreasing', 'stable', 'volatile', 'up', 'down', 'flat'].includes((i.direction || '').toLowerCase())
  );
  const hasTrends = analysisType === 'trend_analysis' && validTrendItems.length > 0;

  // Comparison
  const isComparisonMode = analysisType === 'company_comparison' || analysisType === 'multi_document_comparison';
  const comparisonRows = Array.isArray(documents) && documents.length > 0 ? documents
    : insightItems.length > 0 ? insightItems : [];
  const hasComparison = isComparisonMode && comparisonRows.length > 0;

  // Generic insights (explain_mode, executive_summary key findings, etc.)
  // Never show for report_generator — its full content is in the answer markdown
  const hasGenericInsights = !hasKpis && !hasRisks && !hasTrends && !hasComparison
    && insightItems.length > 0 && analysisType !== 'report_generator';

  // Key findings from metadata
  const keyFindings = metadata?.key_findings || [];
  const execSummaryText = metadata?.executive_summary || null;

  // Charts
  const hasCharts = visualizations.length > 0;

  // Documents tab metadata — suppress for report_generator and trend_analysis
  const MODES_WITHOUT_SOURCES = new Set(['report_generator', 'trend_analysis', 'explain_mode']);
  const rawDocsMeta = result?.documents && typeof result.documents === 'object' && !Array.isArray(result.documents)
    ? result.documents : null;
  const hasDocsMeta = Boolean(
    !MODES_WITHOUT_SOURCES.has(analysisType) &&
    rawDocsMeta && Object.values(rawDocsMeta).some(v =>
      Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v.trim().length > 0
    )
  );

  // General metadata (non-SWOT) — suppress for report_generator
  const SWOT_KEYS = new Set(['strengths', 'weaknesses', 'opportunities', 'threats']);
  const hasGeneral = Boolean(
    analysisType !== 'report_generator' &&
    general && Object.entries(general).some(([k, v]) => {
      if (SWOT_KEYS.has(k)) return false;
      if (!v) return false;
      return Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v.trim().length > 0;
    })
  );

  /* ── Tab configuration ───────────────────────────────────────────── */
  const TABS = [
    { label: 'Analysis', icon: <Assessment sx={{ fontSize: 15 }} />, show: true },
    { label: 'Charts',   icon: <AutoGraph sx={{ fontSize: 15 }} />,  show: hasCharts },
    { label: 'Sources',  icon: <Article sx={{ fontSize: 15 }} />,    show: hasDocsMeta },
  ].filter(t => t.show);

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <Box>
      {/* Executive summary banner (from metadata) */}
      {execSummaryText && <ExecSummaryBanner text={execSummaryText} />}

      {/* Tabs — only shown when there are charts or source docs */}
      {TABS.length > 1 && (
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', minHeight: 34 }}>
          {TABS.map((t, i) => (
            <Tab key={i} value={i} icon={t.icon} iconPosition="start" label={t.label}
              sx={{ minHeight: 34, textTransform: 'none', fontSize: '0.8rem', py: 0 }} />
          ))}
        </Tabs>
      )}

      {/* ── Tab 0: Analysis ──────────────────────────────────────── */}
      {tab === 0 && (
        <Box>
          {/* SWOT 2×2 grid */}
          {hasSwot && (
            <Box sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <FlashOn sx={{ fontSize: 18, color: modeColor }} />
                <Typography variant="subtitle1" fontWeight={700}>SWOT Analysis</Typography>
              </Stack>
              <Grid container spacing={1.5}>
                {SWOT_CONFIG.filter(({ key }) => swotData[key]?.length > 0).map(({ key, title, color, Icon }) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <SwotCard title={title} items={swotData[key]} color={color} Icon={Icon} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* KPI / Financial Ratios grid */}
          {hasKpis && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Assessment sx={{ fontSize: 18, color: modeColor }} />
                <Typography variant="subtitle1" fontWeight={700}>{modeMeta?.label || 'Financial KPIs'}</Typography>
                <Chip label={`${insightItems.length} metrics`} size="small"
                  sx={{ height: 20, fontSize: '0.68rem', bgcolor: `${modeColor}18`, color: modeColor }} />
              </Stack>
              <Grid container spacing={1.25}>
                {insightItems.map((item, i) => (
                  <Grid item xs={6} sm={4} md={3} key={i}>
                    <KpiCard item={item} accentColor={modeColor} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Risk cards */}
          {hasRisks && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <WarningAmber sx={{ fontSize: 18, color: '#D97706' }} />
                <Typography variant="subtitle1" fontWeight={700}>Risk Assessment</Typography>
                <Chip label={`${insightItems.length} risks`} size="small"
                  sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#D9770618', color: '#D97706' }} />
              </Stack>
              {insightItems.map((item, i) => <RiskRow key={i} item={item} />)}
            </Box>
          )}

          {/* Trend cards */}
          {hasTrends && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Timeline sx={{ fontSize: 18, color: '#10b981' }} />
                <Typography variant="subtitle1" fontWeight={700}>Trend Analysis</Typography>
                <Chip label={`${validTrendItems.length} trends`} size="small"
                  sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#10b98118', color: '#10b981' }} />
              </Stack>
              {validTrendItems.map((item, i) => <TrendCard key={i} item={item} accentColor={modeColor} />)}
            </Box>
          )}

          {/* Comparison table */}
          {hasComparison && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <DescIcon sx={{ fontSize: 18, color: modeColor }} />
                <Typography variant="subtitle1" fontWeight={700}>{modeMeta?.label || 'Comparison'}</Typography>
              </Stack>
              <ComparisonTable rows={comparisonRows} accentColor={modeColor} />
            </Box>
          )}

          {/* Generic insight cards (explain_mode, report_generator, executive_summary findings, etc.) */}
          {hasGenericInsights && (
            <Box sx={{ mb: 2 }}>
              {insightItems.map((item, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 1, borderLeft: `3px solid ${modeColor}` }}>
                  <Stack direction="row" gap={1} alignItems="flex-start">
                    <InfoOutlined sx={{ fontSize: 16, color: modeColor, mt: 0.25, flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      {item.title && <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.25 }}>{item.title}</Typography>}
                      <Typography variant="body2" color="text.secondary">
                        {item.description || item.text || item.content || (typeof item === 'string' ? item : '')}
                      </Typography>
                      {item.category && <Chip label={item.category} size="small" variant="outlined" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} />}
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Box>
          )}

          {/* Key Findings from metadata */}
          {keyFindings.length > 0 && <KeyFindings items={keyFindings} />}

          {/* Inline charts (when no separate Charts tab) */}
          {hasCharts && TABS.length === 1 && (
            <Box sx={{ mb: 2 }}>
              <DataVisualization content="" data={visualizations} />
            </Box>
          )}

          {/* Markdown prose answer */}
          {answer && answer.trim().length > 0 && (
            <>
              {(hasSwot || hasKpis || hasRisks || hasTrends || hasComparison || insightItems.length > 0) && (
                <Divider sx={{ my: 1.5 }} />
              )}
              <MarkdownBlock>{answer}</MarkdownBlock>
            </>
          )}

          {/* General metadata accordion (keywords, dates, entities) */}
          {hasGeneral && (
            <Accordion disableGutters elevation={0}
              sx={{ mt: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMore />}
                sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0 } }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>Extracted Metadata</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <GeneralPanel data={general} />
              </AccordionDetails>
            </Accordion>
          )}

          {/* Empty state */}
          {!answer && !hasSwot && !hasKpis && !hasRisks && !hasTrends && !hasComparison
            && insightItems.length === 0 && visualizations.length === 0 && keyFindings.length === 0 && (
            <Typography color="text.disabled" variant="body2">No analysis content was returned.</Typography>
          )}
        </Box>
      )}

      {/* ── Tab 1: Charts ───────────────────────────────────────── */}
      {tab === TABS.findIndex(t => t.label === 'Charts') && tab > 0 && (
        <DataVisualization content="" data={visualizations} />
      )}

      {/* ── Tab N: Sources ──────────────────────────────────────── */}
      {tab === TABS.findIndex(t => t.label === 'Sources') && tab > 0 && (
        <Box sx={{ pt: 1 }}>
          {rawDocsMeta && <DocumentsPanel docs={rawDocsMeta} />}
        </Box>
      )}
    </Box>
  );
};

export default AnalysisResultView;
