/**
 * Enterprise Insights Panel
 * Run enterprise AI analyses on uploaded documents
 */

import { useState } from 'react';
import {
  Box, Typography, Button, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Card, CardContent, CardActionArea,
  TextField, Chip,
} from '@mui/material';
import {
  Summarize, Calculate, Psychology, Warning, CompareArrows,
  Description, TrendingUp, Lightbulb, Assessment, Article,
  BookmarkAdd,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { enterpriseAPI } from '../utils/api';
import CitationPanel from './CitationPanel';

const ANALYSIS_CONFIG = [
  { type: 'executive_summary', label: 'Executive Summary', icon: Summarize, color: '#2563eb' },
  { type: 'financial_ratios', label: 'Financial Ratios', icon: Calculate, color: '#7c3aed' },
  { type: 'swot_analysis', label: 'SWOT Analysis', icon: Psychology, color: '#059669' },
  { type: 'risk_analysis', label: 'Risk Analysis', icon: Warning, color: '#dc2626' },
  { type: 'company_comparison', label: 'Company Comparison', icon: CompareArrows, color: '#0891b2' },
  { type: 'multi_document_comparison', label: 'Multi-Doc Compare', icon: Description, color: '#6366f1' },
  { type: 'kpi_extraction', label: 'Financial KPIs', icon: Assessment, color: '#d97706' },
  { type: 'trend_analysis', label: 'Trend Analysis', icon: TrendingUp, color: '#10b981' },
  { type: 'explain_mode', label: 'AI Explain Mode', icon: Lightbulb, color: '#f59e0b' },
  { type: 'report_generator', label: 'Report Generator', icon: Article, color: '#4f46e5' },
];

const EnterpriseInsights = ({ conversationId, hasDocuments }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [selectedType, setSelectedType] = useState(null);

  const runAnalysis = async (analysisType) => {
    if (!conversationId || !hasDocuments) {
      toast.error('Upload and process documents first');
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
      setOpen(true);
      setCustomQuestion(''); // Reset question after successful analysis
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
        title: ANALYSIS_CONFIG.find((a) => a.type === result.analysisType)?.label || 'Analysis',
        content: result.answer,
        conversationId,
        analysisType: result.analysisType,
      });
      toast.success('Saved to bookmarks');
    } catch {
      toast.error('Failed to save bookmark');
    }
  };

  return (
    <Box sx={{ px: { xs: 1, sm: 2 }, py: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
          Enterprise Analysis
        </Typography>
        {loading && <CircularProgress size={18} />}
      </Box>

      <TextField
        size="small"
        fullWidth
        placeholder="Optional focus question..."
        value={customQuestion}
        onChange={(e) => setCustomQuestion(e.target.value)}
        sx={{ mb: 1.5 }}
        disabled={!hasDocuments}
      />

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
        gap: 1,
      }}>
        {ANALYSIS_CONFIG.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card
                sx={{
                  opacity: hasDocuments ? 1 : 0.5,
                  transition: 'transform 0.2s',
                  '&:hover': hasDocuments ? { transform: 'translateY(-2px)' } : {},
                }}
              >
                <CardActionArea
                  onClick={() => runAnalysis(item.type)}
                  disabled={loading || !hasDocuments}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Icon sx={{ fontSize: 22, color: item.color, mb: 0.5 }} />
                    <Typography variant="caption" fontWeight={600} display="block" lineHeight={1.3}>
                      {item.label}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </motion.div>
          );
        })}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {ANALYSIS_CONFIG.find((a) => a.type === selectedType)?.label || 'Analysis Result'}
          {result?.metadata?.documentsAnalyzed && (
            <Chip label={`${result.metadata.documentsAnalyzed} docs`} size="small" />
          )}
        </DialogTitle>
        <DialogContent dividers>
          <div className="prose-chat">
            <ReactMarkdown>{result?.answer || ''}</ReactMarkdown>
          </div>
          <CitationPanel citations={result?.citations} />
        </DialogContent>
        <DialogActions>
          <Button startIcon={<BookmarkAdd />} onClick={saveBookmark}>
            Bookmark
          </Button>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnterpriseInsights;
