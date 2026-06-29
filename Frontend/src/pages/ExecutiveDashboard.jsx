/**
 * Executive Dashboard — Redesigned
 * Enterprise KPI extraction and executive summary hub.
 */

import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Stack, Typography, Button, Chip,
  Select, MenuItem, FormControl, CircularProgress, Paper, Avatar,
  Divider, Skeleton,
} from '@mui/material';
import {
  TrendingUp, Assessment, Summarize, Warning,
  AccountBalance, ShowChart, BarChart, MonetizationOn,
  ArrowUpward, CheckCircleOutline,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { conversationAPI, enterpriseAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import CitationPanel from '../components/CitationPanel';
import ErrorBoundary from '../components/ErrorBoundary';

/* ─── KPI metadata ─────────────────────────────────────────────────────── */
const KPI_CONFIG = [
  { key: 'revenue',              label: 'Revenue',            icon: MonetizationOn, color: '#2563EB' },
  { key: 'gross_profit',         label: 'Gross Profit',       icon: TrendingUp,     color: '#16A34A' },
  { key: 'operating_income',     label: 'Operating Income',   icon: BarChart,       color: '#7C3AED' },
  { key: 'net_income',           label: 'Net Income',         icon: AccountBalance, color: '#0EA5E9' },
  { key: 'ebitda',               label: 'EBITDA',             icon: ShowChart,      color: '#F59E0B' },
  { key: 'gross_margin_pct',     label: 'Gross Margin',       icon: TrendingUp,     color: '#16A34A', pct: true },
  { key: 'operating_margin_pct', label: 'Operating Margin',   icon: BarChart,       color: '#2563EB', pct: true },
  { key: 'net_margin_pct',       label: 'Net Margin',         icon: ShowChart,      color: '#7C3AED', pct: true },
  { key: 'eps',                  label: 'EPS',                icon: MonetizationOn, color: '#F59E0B' },
  { key: 'total_assets',         label: 'Total Assets',       icon: AccountBalance, color: '#0EA5E9' },
  { key: 'cash_and_equivalents', label: 'Cash & Equivalents', icon: MonetizationOn, color: '#16A34A' },
];

/* ─── KPI Card ─────────────────────────────────────────────────────────── */
const KpiCard = ({ config, value, delay = 0 }) => {
  const Icon = config.icon;
  const display =
    typeof value === 'number'
      ? value.toLocaleString() + (config.pct ? '%' : '')
      : typeof value === 'object' && value !== null
      ? Object.entries(value)
          .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toLocaleString() : v}`)
          .join(', ')
      : String(value);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
            <Box
              sx={{
                width: 32, height: 32, borderRadius: 1.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: `${config.color}18`,
              }}
            >
              <Icon sx={{ color: config.color, fontSize: 16 }} />
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} lineHeight={1.2}>
              {config.label}
            </Typography>
          </Stack>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ fontSize: '1rem', wordBreak: 'break-word', lineHeight: 1.3 }}
          >
            {display}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ─── Step indicator ───────────────────────────────────────────────────── */
const Step = ({ num, label, active, done }) => (
  <Stack direction="row" alignItems="center" gap={1.25}>
    <Avatar
      sx={{
        width: 28, height: 28, fontSize: '0.75rem', fontWeight: 700,
        bgcolor: done ? 'success.main' : active ? 'primary.main' : 'action.hover',
        color: done || active ? '#fff' : 'text.disabled',
        transition: 'all 0.25s',
      }}
    >
      {done ? <CheckCircleOutline sx={{ fontSize: 16 }} /> : num}
    </Avatar>
    <Typography
      variant="body2"
      fontWeight={active || done ? 700 : 400}
      color={active || done ? 'text.primary' : 'text.disabled'}
    >
      {label}
    </Typography>
  </Stack>
);

/* ─────────────────────────────────────────────────────────────────────────── */

const ExecutiveDashboard = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState('');
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeType, setAnalyzeType] = useState('');

  useEffect(() => {
    conversationAPI.getAll()
      .then((res) => setConversations(res.data.data || []))
      .catch(() => toast.error('Failed to load conversations'))
      .finally(() => setLoading(false));
  }, []);

  const loadKPIs = async () => {
    if (!selectedConv) return;
    setAnalyzeType('kpi');
    setAnalyzing(true);
    setKpiData(null);
    try {
      const res = await enterpriseAPI.getAuditSummary({ conversationId: selectedConv });
      setKpiData(res.data.data?.data || null);
    } catch {
      toast.error('Failed to extract KPIs');
    } finally {
      setAnalyzing(false);
      setAnalyzeType('');
    }
  };

  const runExecutiveSummary = async () => {
    if (!selectedConv) return;
    setAnalyzeType('summary');
    setAnalyzing(true);
    setSummary(null);
    try {
      const res = await enterpriseAPI.analyze({
        analysisType: 'executive_summary',
        conversationId: selectedConv,
      });
      setSummary(res.data.data);
      toast.success('Executive summary ready');
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setAnalyzing(false);
      setAnalyzeType('');
    }
  };

  const hasResults = kpiData || summary;
  const step1Done = Boolean(selectedConv);
  const step2Done = Boolean(hasResults);

  if (loading) return <DashboardSkeleton />;

  const presentKpis = KPI_CONFIG.filter((c) => kpiData?.[c.key] != null);

  return (
    <ErrorBoundary>
      <Box sx={{ width: '100%', p: { xs: 2, sm: 2.5, md: 3 }, maxWidth: 1280, mx: 'auto' }}>

        {/* ── Page header ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 0.5 }}>
              <Box
                sx={{
                  width: 44, height: 44, borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                }}
              >
                <TrendingUp sx={{ color: '#fff', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} lineHeight={1.2}>Executive Dashboard</Typography>
                <Typography variant="body2" color="text.secondary">
                  Financial KPI extraction &amp; intelligent summarization
                </Typography>
              </Box>
            </Stack>
          </Box>
        </motion.div>

        {/* ── Progress steps ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                gap={{ xs: 2, sm: 3 }}
              >
                <Step num={1} label="Select conversation" active={!step1Done} done={step1Done} />
                <Box sx={{ flex: 1, height: 1, bgcolor: 'divider', display: { xs: 'none', sm: 'block' } }} />
                <Step num={2} label="Run analysis" active={step1Done && !step2Done} done={step2Done} />
                <Box sx={{ flex: 1, height: 1, bgcolor: 'divider', display: { xs: 'none', sm: 'block' } }} />
                <Step num={3} label="Review insights" active={step2Done} done={false} />
              </Stack>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Controls ────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 2 }}>
                ANALYSIS CONTROLS
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={2}
              >
                <FormControl size="small" sx={{ minWidth: 260, flex: { sm: 1 }, maxWidth: { sm: 360 } }}>
                  <Select
                    value={selectedConv || ''}
                    displayEmpty
                    onChange={(e) => {
                      setSelectedConv(e.target.value);
                      setKpiData(null);
                      setSummary(null);
                    }}
                    renderValue={(v) => {
                      if (!v) return <Typography color="text.disabled" variant="body2">Select a conversation…</Typography>;
                      return conversations.find((c) => c._id === v)?.title || 'Untitled';
                    }}
                  >
                    <MenuItem value="" disabled>
                      <em>Select a conversation…</em>
                    </MenuItem>
                    {conversations.map((c) =>
                      c?._id ? (
                        <MenuItem key={c._id} value={c._id}>
                          {c.title || 'Untitled'}
                        </MenuItem>
                      ) : null,
                    )}
                  </Select>
                </FormControl>

                <Stack direction="row" gap={1.5} flexWrap="wrap">
                  <Button
                    variant="contained"
                    startIcon={analyzing && analyzeType === 'kpi' ? <CircularProgress size={14} color="inherit" /> : <Assessment />}
                    onClick={loadKPIs}
                    disabled={!selectedConv || analyzing}
                    sx={{ minWidth: 140 }}
                  >
                    Extract KPIs
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={analyzing && analyzeType === 'summary' ? <CircularProgress size={14} color="inherit" /> : <Summarize />}
                    onClick={runExecutiveSummary}
                    disabled={!selectedConv || analyzing}
                    sx={{ minWidth: 160 }}
                  >
                    Exec Summary
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── KPI grid ────────────────────────────────────────────── */}
        <AnimatePresence>
          {kpiData && (
            <motion.div
              key="kpis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
                  <TrendingUp sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={700}>Financial KPIs</Typography>
                  {kpiData.company && (
                    <Chip label={kpiData.company} size="small" color="primary" variant="outlined" />
                  )}
                  {kpiData.period && (
                    <Chip label={kpiData.period} size="small" variant="outlined" />
                  )}
                </Stack>

                {presentKpis.length > 0 ? (
                  <Grid container spacing={2}>
                    {presentKpis.map((c, i) => (
                      <Grid item xs={6} sm={4} md={3} key={c.key}>
                        <KpiCard config={c} value={kpiData[c.key]} delay={i * 0.04} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No structured KPI data found in this conversation.
                    </Typography>
                  </Paper>
                )}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Executive Summary ───────────────────────────────────── */}
        <AnimatePresence>
          {summary && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 36, height: 36, borderRadius: 1.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'warning.main', opacity: 1,
                      }}
                    >
                      <Warning sx={{ color: '#fff', fontSize: 18 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>Executive Summary</Typography>
                  </Stack>
                  <Divider sx={{ mb: 2.5 }} />
                  <Box
                    className="prose-chat"
                    sx={{
                      '& p': { mb: 1.5, lineHeight: 1.75 },
                      '& h1,& h2,& h3': { fontWeight: 700, mt: 2.5, mb: 1 },
                      '& ul,& ol': { pl: 2.5, mb: 1.5 },
                      '& li': { mb: 0.75, lineHeight: 1.7 },
                    }}
                  >
                    <ReactMarkdown>{summary.answer || ''}</ReactMarkdown>
                  </Box>
                  {summary.citations?.length > 0 && (
                    <>
                      <Divider sx={{ mt: 3, mb: 2 }} />
                      <CitationPanel citations={summary.citations} />
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ─────────────────────────────────────────── */}
        {!hasResults && !analyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Paper
              sx={{
                p: 6, textAlign: 'center',
                border: '2px dashed', borderColor: 'divider',
                bgcolor: 'transparent',
              }}
            >
              <Box
                sx={{
                  width: 64, height: 64, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #2563EB18, #7C3AED18)',
                  mx: 'auto', mb: 2,
                }}
              >
                <Assessment sx={{ fontSize: 30, color: 'primary.main' }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                Ready to analyze
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380, mx: 'auto' }}>
                Select a conversation that contains uploaded financial documents, then click
                "Extract KPIs" or "Exec Summary" to generate insights.
              </Typography>
            </Paper>
          </motion.div>
        )}

        {/* ── Loading skeleton while analyzing ───────────────────── */}
        {analyzing && (
          <Grid container spacing={2}>
            {[...Array(8)].map((_, i) => (
              <Grid item xs={6} sm={4} md={3} key={i}>
                <Card>
                  <CardContent>
                    <Skeleton variant="rounded" width={32} height={32} sx={{ mb: 1.5, borderRadius: 1.5 }} />
                    <Skeleton variant="text" width="60%" sx={{ mb: 0.75 }} />
                    <Skeleton variant="text" width="80%" height={32} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default ExecutiveDashboard;
