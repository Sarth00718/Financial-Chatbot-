/**
 * Enterprise Insights Panel
 * Compact collapsible panel — sits above the input bar as a slim toggle strip.
 * Expands into a bottom sheet with analysis tools. Never breaks chat layout.
 *
 * CHANGE: the result dialog now renders <AnalysisResultView> instead of
 * dumping `result.answer` straight into <ReactMarkdown>. The API's analyze
 * payload is structured ({ answer, documents, insights, general,
 * visualizations }) — previously only `answer` was shown, and whenever the
 * backend put the whole structured payload into `answer` as a JSON string
 * (the bug from the screenshot), it rendered as raw text. AnalysisResultView
 * + normalizeAnalysisResult() handle both cases and produce mode-specific UI
 * (KPI/finding cards, charts, tags) per analysis type.
 */

import { useState } from 'react';
import {
  Box, Typography, Button, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Chip, Tooltip, IconButton,
  TextField, Collapse, Stack,
} from '@mui/material';
import {
  Summarize, Calculate, Psychology, Warning, CompareArrows,
  Description, TrendingUp, Lightbulb, Assessment, Article,
  BookmarkAdd, Visibility, AutoAwesome, ExpandLess, ExpandMore,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { enterpriseAPI } from '../utils/api';
import CitationPanel from './CitationPanel';
import AnalysisResultView from './AnalysisResultView';

const ANALYSIS_CONFIG = [
  { type: 'executive_summary',        label: 'Executive Summary',    icon: Summarize,        color: '#2563eb' },
  { type: 'financial_ratios',         label: 'Financial Ratios',     icon: Calculate,        color: '#7c3aed' },
  { type: 'swot_analysis',            label: 'SWOT Analysis',        icon: Psychology,       color: '#059669' },
  { type: 'risk_analysis',            label: 'Risk Analysis',        icon: Warning,          color: '#dc2626' },
  { type: 'company_comparison',       label: 'Company Comparison',   icon: CompareArrows,    color: '#0891b2' },
  { type: 'multi_document_comparison',label: 'Multi-Doc Compare',    icon: Description,      color: '#6366f1' },
  { type: 'kpi_extraction',           label: 'Financial KPIs',       icon: Assessment,       color: '#d97706' },
  { type: 'trend_analysis',           label: 'Trend Analysis',       icon: TrendingUp,       color: '#10b981' },
  { type: 'explain_mode',             label: 'AI Explain Mode',      icon: Lightbulb,        color: '#f59e0b' },
  { type: 'report_generator',         label: 'Report Generator',     icon: Article,          color: '#4f46e5' },
];

const EnterpriseInsights = ({ conversationId, hasDocuments }) => {
  const [expanded, setExpanded]           = useState(false);
  const [loading, setLoading]             = useState(false);
  const [result, setResult]               = useState(null);
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [selectedType, setSelectedType]   = useState(null);

  const runAnalysis = async (analysisType) => {
    if (!conversationId || !hasDocuments) {
      toast.error('Upload and process a document first');
      return;
    }
    setSelectedType(analysisType);
    setLoading(true);
    setResult(null);
    try {
      const response = await enterpriseAPI.analyze({
        analysisType,
        conversationId,
        question: customQuestion,
      });
      setResult(response.data.data);
      setDialogOpen(true);
      setCustomQuestion('');
      toast.success('Analysis complete');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const saveBookmark = async () => {
    if (!result) return;
    try {
      await enterpriseAPI.createBookmark({
        title: selectedConfig?.label || 'Analysis',
        content: result.answer,
        conversationId,
        analysisType: result.analysisType,
      });
      toast.success('Saved to bookmarks');
    } catch {
      toast.error('Failed to save bookmark');
    }
  };

  const saveToWatchlist = async () => {
    if (!result) return;
    try {
      await enterpriseAPI.addToWatchlist({
        name: selectedConfig?.label || 'Analysis',
        notes: result.answer ? result.answer.substring(0, 200) : '',
        conversationId,
        tags: [result.analysisType].filter(Boolean),
      });
      toast.success('Added to watchlist');
    } catch {
      toast.error('Failed to add to watchlist');
    }
  };

  const selectedConfig = ANALYSIS_CONFIG.find((a) => a.type === selectedType);

  return (
    <>
      {/* ── Toggle strip ── */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          onClick={() => setExpanded((v) => !v)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 0.75,
            cursor: 'pointer',
            userSelect: 'none',
            '&:hover': { bgcolor: 'action.hover' },
            transition: 'background-color 0.15s',
          }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <AutoAwesome
              sx={{
                fontSize: 15,
                color: hasDocuments ? 'primary.main' : 'text.disabled',
              }}
            />
            <Typography
              variant="caption"
              fontWeight={700}
              color={hasDocuments ? 'text.primary' : 'text.disabled'}
              sx={{ letterSpacing: 0.2 }}
            >
              Enterprise analysis
            </Typography>
            {!hasDocuments && (
              <Typography variant="caption" color="text.disabled">
                — upload a document to enable
              </Typography>
            )}
            {loading && <CircularProgress size={12} sx={{ ml: 0.5 }} />}
          </Stack>

          <Stack direction="row" alignItems="center" gap={0.5}>
            {hasDocuments && !expanded && (
              <Stack direction="row" gap={0.5} sx={{ mr: 1 }}>
                {ANALYSIS_CONFIG.slice(0, 4).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Tooltip key={item.type} title={item.label} arrow>
                      <Icon
                        sx={{ fontSize: 14, color: item.color, opacity: 0.7 }}
                        aria-hidden="true"
                      />
                    </Tooltip>
                  );
                })}
                <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                  +{ANALYSIS_CONFIG.length - 4} more
                </Typography>
              </Stack>
            )}
            <IconButton size="small" sx={{ p: 0.25 }} tabIndex={-1}>
              {expanded ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
            </IconButton>
          </Stack>
        </Box>

        {/* ── Expanded panel ── */}
        <Collapse in={expanded} unmountOnExit>
          <Box
            sx={{
              px: 2,
              pt: 1,
              pb: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            {/* Optional focus question */}
            <TextField
              size="small"
              fullWidth
              placeholder="Optional: focus question for the analysis…"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              disabled={!hasDocuments || loading}
              sx={{
                mb: 1.5,
                '& .MuiInputBase-root': { borderRadius: 2, fontSize: '0.8125rem' },
              }}
            />

            {/* Analysis buttons — horizontal scrolling row on mobile, wrapping grid on desktop */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
              }}
            >
              {ANALYSIS_CONFIG.map((item, idx) => {
                const Icon = item.icon;
                const isActive = loading && selectedType === item.type;
                return (
                  <motion.div
                    key={item.type}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.02, duration: 0.15 }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={loading || !hasDocuments}
                      onClick={() => runAnalysis(item.type)}
                      startIcon={
                        isActive
                          ? <CircularProgress size={13} sx={{ color: item.color }} />
                          : <Icon sx={{ fontSize: '15px !important', color: item.color }} />
                      }
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        py: 0.5,
                        px: 1.25,
                        borderColor: 'divider',
                        color: 'text.primary',
                        bgcolor: 'background.paper',
                        whiteSpace: 'nowrap',
                        '&:hover': {
                          borderColor: item.color,
                          bgcolor: 'background.paper',
                          color: item.color,
                          '& .MuiButton-startIcon svg': { color: `${item.color} !important` },
                        },
                        '&.Mui-disabled': { opacity: 0.45 },
                        transition: 'border-color 0.15s, color 0.15s',
                      }}
                    >
                      {item.label}
                    </Button>
                  </motion.div>
                );
              })}
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* ── Result dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            pb: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {selectedConfig && (
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${selectedConfig.color}18`,
                flexShrink: 0,
              }}
            >
              <selectedConfig.icon sx={{ fontSize: 18, color: selectedConfig.color }} />
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {selectedConfig?.label || 'Analysis result'}
            </Typography>
            {result?.metadata?.documentsAnalyzed && (
              <Typography variant="caption" color="text.secondary">
                {result.metadata.documentsAnalyzed} document
                {result.metadata.documentsAnalyzed !== 1 ? 's' : ''} analysed
              </Typography>
            )}
          </Box>
          {result?.metadata?.documentsAnalyzed && (
            <Chip
              label={`${result.metadata.documentsAnalyzed} doc${result.metadata.documentsAnalyzed !== 1 ? 's' : ''}`}
              size="small"
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
          )}
        </DialogTitle>

        <DialogContent dividers>
          <AnalysisResultView result={result} accentColor={selectedConfig?.color || '#2563eb'} />
          <CitationPanel citations={result?.citations} />
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          <Button
            size="small"
            startIcon={<BookmarkAdd fontSize="small" />}
            onClick={saveBookmark}
            variant="outlined"
          >
            Save to bookmarks
          </Button>
          <Button
            size="small"
            startIcon={<Visibility fontSize="small" />}
            onClick={saveToWatchlist}
            variant="outlined"
            color="success"
          >
            Add to watchlist
          </Button>
          <Button size="small" onClick={() => setDialogOpen(false)} variant="contained" disableElevation>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EnterpriseInsights;