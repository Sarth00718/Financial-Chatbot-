/**
 * Message
 * Renders one chat message (user / assistant / system) — pure MUI.
 * Enterprise AI modes (Document_Analysis, Analytical_Insights) are routed
 * through AnalysisResultView for SWOT cards, KPI tiles, and charts.
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Stack, Avatar, Paper, Typography, IconButton, TextField, Button, Tooltip, Chip,
} from '@mui/material';
import {
  Person, Insights, InfoOutlined, Edit, Delete, Check, Close,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SpeakerButton } from './VoiceInput';
import DataVisualization from './DataVisualization';
import CitationPanel from './CitationPanel';
import AnalysisResultView from './AnalysisResultView';
import { messageAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

/* Modes that get the full enterprise result view */
const ENTERPRISE_MODES = new Set(['Document_Analysis', 'Analytical_Insights']);

const parseJsonFromText = (text) => {
  if (!text || typeof text !== 'string') return null;

  const normalizeJsonNumberCommas = (text) => {
    let result = '';
    let inString = false;
    let escape = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (escape) {
        result += char;
        escape = false;
        continue;
      }
      if (char === '\\') {
        result += char;
        escape = true;
        continue;
      }
      if (char === '"') {
        result += char;
        inString = !inString;
        continue;
      }

      if (!inString && char === ',') {
        const prev = text[i - 1];
        const next = text[i + 1];
        if (prev && next && /\d/.test(prev) && /\d/.test(next)) {
          continue;
        }
      }

      result += char;
    }

    return result;
  };

  const tryParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      const cleaned = normalizeJsonNumberCommas(value);
      if (cleaned === value) return null;
      try {
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
  };

  const findMatchingSegment = (source, startIndex) => {
    let depth = 0;
    let inString = false;
    let escape = false;
    const openChar = source[startIndex];
    const closeChar = openChar === '[' ? ']' : openChar === '{' ? '}' : null;
    if (!closeChar) return null;

    for (let i = startIndex; i < source.length; i += 1) {
      const char = source[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === openChar) depth += 1;
      else if (char === closeChar) {
        depth -= 1;
        if (depth === 0) {
          return source.slice(startIndex, i + 1);
        }
      }
    }
    return null;
  };

  const cleaned = text.trim();
  let parsed = tryParse(cleaned);
  if (parsed) return parsed;

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    parsed = tryParse(fenceMatch[1].trim());
    if (parsed) return parsed;
  }

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const startIndex = firstBrace !== -1 ? firstBrace : firstBracket;
  if (startIndex !== -1) {
    const segment = findMatchingSegment(cleaned, startIndex);
    parsed = segment ? tryParse(segment) : null;
    if (parsed) return parsed;
  }

  const fieldPattern = /["']?visualizations["']?\s*:\s*\[/gi;
  let match;
  while ((match = fieldPattern.exec(cleaned))) {
    const arrayStart = cleaned.indexOf('[', match.index);
    if (arrayStart === -1) continue;
    const segment = findMatchingSegment(cleaned, arrayStart);
    const arrayValue = segment ? tryParse(segment) : null;
    if (Array.isArray(arrayValue)) {
      return { visualizations: arrayValue };
    }
  }

  return null;
};

const extractStringField = (text, field) => {
  const fieldRegex = new RegExp(`["]?${field}["]?\s*:\s*`, 'i');
  const fieldMatch = text.match(fieldRegex);
  if (!fieldMatch) return null;

  let pos = fieldMatch.index + fieldMatch[0].length;
  while (pos < text.length && /\s/.test(text[pos])) pos += 1;
  if (pos >= text.length) return null;

  const quote = text[pos];
  if (quote === '"' || quote === "'") {
    pos += 1;
    let value = '';
    let escaped = false;
    for (; pos < text.length; pos += 1) {
      const char = text[pos];
      if (escaped) {
        value += char;
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) {
        return value;
      }
      value += char;
    }
    return value;
  }

  // fallback to non-quoted value
  let value = '';
  while (pos < text.length && !/[\r\n,}]/.test(text[pos])) {
    value += text[pos];
    pos += 1;
  }
  return value.trim() || null;
};

const isNonEmptyObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;

const hasStructuredFields = (value) => {
  if (!isNonEmptyObject(value)) return false;
  return Object.values(value).some((field) => {
    if (Array.isArray(field)) return field.length > 0;
    if (isNonEmptyObject(field)) return true;
    return typeof field === 'string' ? field.trim().length > 0 : Boolean(field);
  });
};

const normalizeFeatureMode = (value) => (typeof value === 'string' ? value.trim() : 'Smart_Chat');

const getAssistantAnswer = (content) => {
  const parsed = parseJsonFromText(content);
  if (parsed && typeof parsed === 'object') {
    if (typeof parsed.answer === 'string' && parsed.answer.trim().length > 0) {
      // Strip any JSON wrapper artifacts the LLM prepended to the answer text
      let ans = parsed.answer
        .replace(/^\{\s*["']?answer["']?\s*:\s*["']/i, '')
        .replace(/\n+Visualizations?:[\s\S]*$/i, '')
        .replace(/###\s*.*?\s*###\n*/g, '')
        .trim();
      return ans;
    }
  }

  // Fallback: try extracting the answer field from raw text
  const text = extractStringField(content, 'answer');
  if (text) return text;

  // If content itself starts with { it is raw JSON — return empty (AnalysisResultView will handle it)
  if (content && content.trimStart().startsWith('{')) return '';

  return content;
};

const getVisualizationPayload = (message) => {
  if (Array.isArray(message.visualizationsData) && message.visualizationsData.length > 0) {
    return message.visualizationsData;
  }

  if (message.visualizationsData && typeof message.visualizationsData === 'object') {
    const payload = message.visualizationsData.visualizations || message.visualizationsData.data;
    if (Array.isArray(payload) && payload.length > 0) {
      return payload;
    }
  }

  const parsed = parseJsonFromText(message.content);
  if (parsed) {
    if (Array.isArray(parsed.visualizations) && parsed.visualizations.length > 0) {
      return parsed.visualizations;
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed.visualizations && typeof parsed.visualizations === 'string') {
      const nested = parseJsonFromText(parsed.visualizations);
      if (Array.isArray(nested) && nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
};

const FEATURE_MODE_META = {
  Smart_Chat: { label: 'Smart Chat', color: '#2563EB' },
  Document_Analysis: { label: 'Document Analysis', color: '#16A34A' },
  Analytical_Insights: { label: 'Analytical Insights', color: '#7C3AED' },
  General_Conversation: { label: 'General Conversation', color: '#64748B' },
};

const Message = ({ message, onMessageUpdate, onMessageDelete, onRegenerateResponse, featureMode }) => {
  const { user } = useAuth();
  const { role, content, createdAt, citations } = message;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  const isSystem = role === 'system';

  const mode = normalizeFeatureMode(featureMode || message.featureUsed || 'Smart_Chat');
  const modeMeta = FEATURE_MODE_META[mode] || FEATURE_MODE_META.Smart_Chat;

  const parsedJson = parseJsonFromText(content) || {};
  const hasEnterprisePayload = Boolean(
    parsedJson && typeof parsedJson === 'object' && (
      parsedJson.insights || parsedJson.visualizations || parsedJson.general || parsedJson.documents || parsedJson.analysisType
    )
  );
  const isEnterpriseMode = ENTERPRISE_MODES.has(mode) || hasEnterprisePayload;

  // For enterprise modes or structured enterprise payloads: pass the full payload to AnalysisResultView
  // When content is stored as full JSON (new path), parsedJson has everything.
  // When content is just the answer string with separate fields on message (old path), merge them.
  const enterpriseResult = (() => {
    // New path: content IS the full structured JSON payload
    if (parsedJson && parsedJson.analysisType) {
      return {
        answer: parsedJson.answer ?? '',
        analysisType: parsedJson.analysisType,
        documents: parsedJson.documents ?? {},
        insights: parsedJson.insights ?? [],
        general: parsedJson.general ?? null,
        visualizations: parsedJson.visualizations ?? [],
        metadata: parsedJson.metadata ?? {},
        citations: parsedJson.citations ?? citations ?? [],
      };
    }
    // Old path or mixed: content is answer text, structured data on message fields
    return {
      answer: parsedJson.answer ?? content,
      analysisType: parsedJson.analysisType ?? message.analysisType ?? null,
      documents: parsedJson.documents ?? message.documentsData ?? {},
      insights: parsedJson.insights ?? message.insightsData ?? [],
      general: parsedJson.general ?? message.generalData ?? null,
      visualizations: parsedJson.visualizations ?? message.visualizationsData ?? [],
      metadata: parsedJson.metadata ?? {},
      citations: parsedJson.citations ?? citations ?? [],
    };
  })();

  const visualizationPayload = getVisualizationPayload(message);

  useEffect(() => { /* reset nothing; no tab state needed */ }, [content, mode]);

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === content) {
      setIsEditing(false);
      setEditContent(content);
      return;
    }
    try {
      await messageAPI.update(message._id, editContent.trim());
      onMessageUpdate(message._id, editContent.trim());
      setIsEditing(false);
      toast.success('Message updated');
    } catch (error) {
      console.error('Failed to update message:', error);
      toast.error('Failed to update message');
      setEditContent(content);
    }
  };

  const handleEditAndRegenerate = async () => {
    if (!editContent.trim() || editContent === content) {
      setIsEditing(false);
      setEditContent(content);
      return;
    }
    try {
      setIsRegenerating(true);
      const response = await messageAPI.editAndRegenerate(message._id, editContent.trim());
      onRegenerateResponse?.(response.data.data);
      setIsEditing(false);
      toast.success('Response regenerated');
    } catch (error) {
      console.error('Failed to regenerate response:', error);
      toast.error('Failed to regenerate response');
      setEditContent(content);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteClick = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    handleConfirmDelete();
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await messageAPI.delete(message._id);
      onMessageDelete(message._id);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(content);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor((now - date) / 3600000);
    const diffDays = Math.floor((now - date) / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const assistantText = isAssistant ? getAssistantAnswer(content) : content;

  if (isDeleting) return null;

  return (
    <Stack
      direction="row"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      spacing={1.5}
      sx={{ mb: 3 }}
      className="message-row"
    >
      {!isUser && (
        <Avatar
          sx={{
            width: 36, height: 36, alignSelf: 'flex-end',
            bgcolor: isAssistant ? 'primary.main' : 'action.hover',
            background: isAssistant ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : undefined,
          }}
        >
          {isAssistant ? <Insights sx={{ fontSize: 18 }} /> : <InfoOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />}
        </Avatar>
      )}

      <Box sx={{ maxWidth: isEnterpriseMode ? { xs: '96%', md: '88%' } : { xs: '82%', md: '68%' }, display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {isUser && (
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, textAlign: 'right' }}>
            {user?.name || user?.email || 'You'}
          </Typography>
        )}
        <Paper
          variant="outlined"
          sx={{
            p: 1.75,
            borderRadius: 3,
            bgcolor: isUser ? 'primary.main' : isSystem ? 'action.hover' : 'background.paper',
            color: isUser ? '#fff' : 'text.primary',
            borderColor: isUser ? 'primary.main' : 'divider',
            position: 'relative',
            borderLeft: isAssistant ? `4px solid ${modeMeta.color}` : undefined,
            boxShadow: isAssistant ? '0 8px 18px rgba(15, 23, 42, 0.06)' : undefined,
            '&:hover .msg-actions': { opacity: 1 },
          }}
        >
          <Stack direction="row" justifyContent="space-between" gap={1.5} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {isAssistant && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={modeMeta.label}
                    sx={{
                      color: modeMeta.color,
                      borderColor: modeMeta.color,
                      bgcolor: `${modeMeta.color}1A`,
                      fontWeight: 700,
                      height: 24,
                    }}
                  />
                  {featureMode && featureMode !== mode && (
                    <Typography variant="caption" color="text.secondary">
                      Conversation mode: {featureMode.replace(/_/g, ' ')}
                    </Typography>
                  )}
                </Stack>
              )}

              {isEditing ? (
                <Stack spacing={1}>
                  <TextField
                    multiline
                    minRows={2}
                    fullWidth
                    autoFocus
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) handleEditAndRegenerate();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    size="small"
                  />
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Button size="small" variant="contained" startIcon={<Check fontSize="small" />} onClick={handleEditAndRegenerate} disabled={isRegenerating}>
                      {isRegenerating ? 'Regenerating…' : 'Save & Regenerate'}
                    </Button>
                    <Button size="small" variant="text" onClick={handleEdit} disabled={isRegenerating}>Save Only</Button>
                    <Button size="small" variant="text" color="inherit" onClick={handleCancelEdit} disabled={isRegenerating}>Cancel</Button>
                  </Stack>
                </Stack>
              ) : isAssistant ? (
                <Box sx={{ width: '100%' }}>
                  {isEnterpriseMode ? (
                    /* ── Enterprise AI mode: full structured card view ── */
                    <>
                      <AnalysisResultView
                        result={enterpriseResult}
                        accentColor={modeMeta.color}
                      />
                      <CitationPanel citations={citations} />
                    </>
                  ) : (
                    /* ── Smart Chat / General Conversation: plain markdown ── */
                    <Box className="prose-chat" sx={{
                      '& table': { borderCollapse: 'collapse', width: '100%', my: 1, display: 'block', overflowX: 'auto' },
                      '& th': { border: '1px solid', borderColor: 'divider', px: 1.5, py: 0.75, fontWeight: 700, fontSize: '0.8125rem', textAlign: 'left', bgcolor: 'action.hover' },
                      '& td': { border: '1px solid', borderColor: 'divider', px: 1.5, py: 0.5, fontSize: '0.8125rem' },
                      '& tr:nth-of-type(even)': { bgcolor: 'action.hover' },
                      '& p': { my: 0.75 },
                      '& ul,& ol': { pl: 3 },
                    }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{assistantText}</ReactMarkdown>
                      <CitationPanel citations={citations} />
                      {visualizationPayload.length > 0 && (
                        <DataVisualization content="" data={visualizationPayload} />
                      )}
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography variant={isSystem ? 'caption' : 'body2'} sx={{ whiteSpace: 'pre-wrap' }}>
                  {content}
                </Typography>
              )}
            </Box>

            {!isEditing && (
              <Stack direction="row" className="msg-actions" sx={{ opacity: { xs: 1, sm: 0 }, transition: 'opacity 0.15s', flexShrink: 0 }}>
                {isAssistant && <SpeakerButton text={content} />}
                {isUser && !showDeleteConfirm && (
                  <>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => setIsEditing(true)} sx={{ color: 'rgba(255,255,255,0.85)' }}><Edit sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" onClick={handleDeleteClick} sx={{ color: 'rgba(255,255,255,0.85)' }}><Delete sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                  </>
                )}
                {isUser && showDeleteConfirm && (
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>Delete?</Typography>
                    <IconButton size="small" onClick={handleConfirmDelete} sx={{ color: '#fff' }}><Check sx={{ fontSize: 14 }} /></IconButton>
                    <IconButton size="small" onClick={() => setShowDeleteConfirm(false)} sx={{ color: '#fff' }}><Close sx={{ fontSize: 14 }} /></IconButton>
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        </Paper>

        {createdAt && !isEditing && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, px: 0.5 }}>
            {formatTime(createdAt)}
          </Typography>
        )}

        {/* Charts already rendered inside AnalysisResultView for enterprise modes */}
      </Box>

      {isUser && (
        <Avatar sx={{ width: 36, height: 36, alignSelf: 'flex-end', bgcolor: 'action.hover', color: 'text.secondary' }}>
          <Person sx={{ fontSize: 18 }} />
        </Avatar>
      )}
    </Stack>
  );
};

export default Message;
