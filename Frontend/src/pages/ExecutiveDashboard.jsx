/**
 * Executive Dashboard
 * Enterprise financial insights hub with KPI cards and analysis tools
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Chip,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, Paper,
} from '@mui/material';
import {
  TrendingUp, Assessment, Summarize, Warning, ArrowBack,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { conversationAPI, enterpriseAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import CitationPanel from '../components/CitationPanel';
import ErrorBoundary from '../components/ErrorBoundary';

const KPI_LABELS = {
  revenue: 'Revenue',
  gross_profit: 'Gross Profit',
  operating_income: 'Operating Income',
  net_income: 'Net Income',
  ebitda: 'EBITDA',
  gross_margin_pct: 'Gross Margin',
  operating_margin_pct: 'Operating Margin',
  net_margin_pct: 'Net Margin',
  eps: 'EPS',
  total_assets: 'Total Assets',
  cash_and_equivalents: 'Cash & Equivalents',
};

const ExecutiveDashboard = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState('');
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    conversationAPI.getAll()
      .then((res) => setConversations(res.data.data || []))
      .catch(() => toast.error('Failed to load conversations'))
      .finally(() => setLoading(false));
  }, []);

  const loadKPIs = async () => {
    if (!selectedConv) return;
    setAnalyzing(true);
    try {
      const auditRes = await enterpriseAPI.getAuditSummary({ conversationId: selectedConv });
      setKpiData(auditRes.data.data?.data || null);
    } catch {
      toast.error('Failed to extract KPIs');
    } finally {
      setAnalyzing(false);
    }
  };

  const runExecutiveSummary = async () => {
    if (!selectedConv) return;
    setAnalyzing(true);
    try {
      const res = await enterpriseAPI.analyze({
        analysisType: 'executive_summary',
        conversationId: selectedConv,
      });
      setSummary(res.data.data);
      toast.success('Executive summary generated');
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <ErrorBoundary>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/')}>Back to Chat</Button>
          <Box>
            <Typography variant="h5" fontWeight={700}>Executive Dashboard</Typography>
            <Typography variant="body2" color="text.secondary">Financial insights and KPI overview</Typography>
          </Box>
        </Box>

        <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Conversation</InputLabel>
            <Select
              value={selectedConv || ""}
              label="Conversation"
              onChange={(e) => { setSelectedConv(e.target.value); setKpiData(null); setSummary(null); }}
            >
              <MenuItem value="">
                <em>Select a conversation</em>
              </MenuItem>
              {Array.isArray(conversations) && conversations.map((c) => c && c._id ? (
                <MenuItem key={c._id} value={c._id}>{c.title || "Untitled"}</MenuItem>
              ) : null)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Assessment />} onClick={loadKPIs} disabled={!selectedConv || analyzing}>
            Extract KPIs
          </Button>
          <Button variant="outlined" startIcon={<Summarize />} onClick={runExecutiveSummary} disabled={!selectedConv || analyzing}>
            Executive Summary
          </Button>
          {analyzing && <CircularProgress size={24} />}
        </Paper>

        {kpiData && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp color="primary" /> Financial KPIs
              {kpiData.company && typeof kpiData.company === 'string' && <Chip label={kpiData.company} size="small" />}
              {kpiData.period && typeof kpiData.period === 'string' && <Chip label={kpiData.period} size="small" variant="outlined" />}
            </Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 3,
            }}>
              {Object.entries(KPI_LABELS).map(([key, label]) => {
                const val = kpiData[key];
                if (val == null) return null;
                return (
                  <Card key={key}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', wordBreak: 'break-word' }}>
                        {typeof val === 'number'
                          ? val.toLocaleString()
                          : typeof val === 'object' && val !== null
                            ? Object.entries(val).map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toLocaleString() : String(v)}`).join(', ')
                            : String(val)}
                        {(key.includes('margin') || key.includes('pct')) ? '%' : ''}
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </motion.div>
        )}

        {summary && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning color="warning" /> Executive Summary
              </Typography>
              <div className="prose-chat">
                <ReactMarkdown>{summary.answer || ''}</ReactMarkdown>
              </div>
              <CitationPanel citations={summary.citations || []} />
            </Paper>
          </motion.div>
        )}

        {!selectedConv && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Select a conversation with uploaded documents to begin analysis</Typography>
          </Paper>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default ExecutiveDashboard;
