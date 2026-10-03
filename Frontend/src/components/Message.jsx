import { useState } from 'react';
import {
  Box, Avatar, Typography, Paper, IconButton, Tooltip, Menu, MenuItem,
  ListItemIcon, ListItemText, Chip, Collapse, alpha, Divider,
} from '@mui/material';
import DataVisualization from './DataVisualization.jsx';
import {
  ContentCopy, Edit, Delete, Refresh, ThumbUp, ThumbDown,
  Bookmark, Share, Check, MoreHoriz, SmartToy, Person,
  Description, TrendingUp, Forum, VolumeUp, Stop,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { messageAPI } from '../utils/api';

const roleConfig = {
  user: {
    color: '#2563EB',
    bgColor: 'rgba(37,99,235,0.08)',
    borderColor: 'rgba(37,99,235,0.15)',
    icon: Person,
    align: 'right',
  },
  assistant: {
    color: '#7C3AED',
    bgColor: 'rgba(124,58,237,0.06)',
    borderColor: 'rgba(124,58,237,0.12)',
    icon: SmartToy,
    align: 'left',
  },
  system: {
    color: '#64748B',
    bgColor: 'rgba(100,116,139,0.08)',
    borderColor: 'rgba(100,116,139,0.12)',
    icon: null,
    align: 'center',
  },
};

const featureMeta = {
  Smart_Chat: { icon: Forum, label: 'Smart Chat', color: '#2563EB' },
  Document_Analysis: { icon: Description, label: 'Analysis', color: '#16A34A' },
  Analytical_Insights: { icon: TrendingUp, label: 'Insights', color: '#7C3AED' },
  General_Conversation: { icon: Forum, label: 'General', color: '#64748B' },
};

const CodeBlock = ({ node, inline, className, children, ...props }) => {
  if (inline) {
    return <code className="prose-chat code" {...props}>{children}</code>;
  }
  const text = String(children).replace(/\n$/, '');
  return (
    <Box sx={{ position: 'relative', my: 1.5 }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 1.5, py: 0.5, borderRadius: '8px 8px 0 0',
          bgcolor: alpha('#0A0D14', 0.06), border: '1px solid', borderColor: 'divider', borderBottom: 'none',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.675rem' }}>
          {(className || '').replace('language-', '') || 'code'}
        </Typography>
        <IconButton
          size="small"
          onClick={() => { navigator.clipboard.writeText(text); toast.success('Copied!'); }}
          sx={{ width: 24, height: 24 }}
        >
          <ContentCopy sx={{ fontSize: 12 }} />
        </IconButton>
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0, borderRadius: '0 0 8px 8px',
          bgcolor: alpha('#0A0D14', 0.04),
          border: '1px solid', borderColor: 'divider',
          p: 1.5, overflowX: 'auto',
        }}
      >
        <Box component="code" sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem', lineHeight: 1.6 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

const Message = ({ message, featureMode, onMessageUpdate, onMessageDelete, onRegenerateResponse }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const config = roleConfig[message.role] || roleConfig.system;
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const Icon = config.icon;
  const FeatureIcon = featureMeta[featureMode]?.icon || Forum;

  // Parse JSON-stringified content from any mode (enterprise modes, etc.)
  // Extract the answer text for display; structured data is in separate fields.
  const displayContent = (() => {
    if (typeof message.content !== 'string') return '';
    if (message.content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(message.content);
        if (parsed && typeof parsed.answer === 'string') return parsed.answer;
      } catch { /* fall through to lenient extraction */ }
      // Lenient: find answer field closing quote using state machine
      try {
        const s = message.content;
        const ansKey = '"answer":';
        const ansIdx = s.indexOf(ansKey);
        if (ansIdx !== -1) {
          const afterColon = s.indexOf('"', ansIdx + ansKey.length);
          if (afterColon !== -1) {
            let i = afterColon + 1;
            let escaped = false;
            for (; i < s.length; i++) {
              const ch = s[i];
              if (escaped) { escaped = false; continue; }
              if (ch === '\\') { escaped = true; continue; }
              if (ch === '"') {
                const lookahead = s.slice(i + 1).trimStart();
                let isClosing = false;
                if (lookahead.startsWith(',') || lookahead.startsWith('}')) {
                  if (lookahead.startsWith(',')) {
                    if (lookahead.slice(1).trimStart().startsWith('"')) isClosing = true;
                  } else if (lookahead.startsWith('}')) {
                    const afterBrace = lookahead.slice(1).trimStart();
                    if (!afterBrace || afterBrace.startsWith(',') || afterBrace.startsWith(']')) isClosing = true;
                  }
                }
                if (isClosing) break;
              }
            }
            const raw = s.slice(afterColon + 1, i);
            // Attempt to unescape JSON escapes
            try { return JSON.parse('"' + raw + '"'); } catch { return raw; }
          }
        }
      } catch { /* give up */ }
    }
    return message.content;
  })();

  // Strip any JSON-like object literals (e.g. { "title": ... }) that the AI
  // accidentally embedded in the answer text despite prompt instructions.
  const cleanedContent = (() => {
    let txt = displayContent;
    // Remove JSON objects that appear mid-sentence: { "key": value, ... }
    // This matches { ... } with at least one quoted key inside.
    txt = txt.replace(/\{\s*"[^"]+"\s*:\s*[^}]+\}/g, '');
    // Collapse multiple blank lines into one
    txt = txt.replace(/\n{3,}/g, '\n\n');
    return txt.trim();
  })();

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanedContent);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    setEditText(cleanedContent);
    setIsEditing(true);
    setMenuAnchor(null);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    const edited = editText.trim();
    try {
      const res = await messageAPI.editAndRegenerate(message._id, edited);
      const data = res.data?.data;
      if (data?.assistantMessage) {
        onRegenerateResponse(data);
      } else {
        // AI regeneration failed — still update the user message locally
        onMessageUpdate(message._id, edited);
        toast('Message saved. AI regeneration unavailable.', { icon: '⚠️' });
      }
      setIsEditing(false);
    } catch (err) {
      // API call itself failed — keep edit open but show error
      toast.error('Failed to save. Try again.');
    }
  };

  const handleDelete = async () => {
    setMenuAnchor(null);
    try {
      const res = await messageAPI.delete(message._id);
      const deletedIds = res.data?.data?.deletedIds || [message._id];
      onMessageDelete(deletedIds);
      toast.success('Message deleted');
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  const handleRegenerate = async () => {
    setMenuAnchor(null);
    try {
      const res = await messageAPI.editAndRegenerate(message._id, message.content);
      if (res.data?.data) onRegenerateResponse(res.data.data);
    } catch (err) {
      toast.error('Failed to regenerate');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'FinChatBot Analysis',
        text: cleanedContent,
      }).catch(console.error);
    } else {
      handleCopy();
      toast('Copied to clipboard to share', { icon: '🔗' });
    }
  };

  const handleReadAloud = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    
    window.speechSynthesis.cancel();
    
    const speakableText = cleanedContent.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(speakableText);
    
    window.__currentUtterance = utterance;
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  if (isSystem) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2, px: 4 }}>
          <Paper
            variant="outlined"
            sx={{
              px: 2.5, py: 1, borderRadius: 3,
              bgcolor: alpha('#64748B', 0.06),
              borderColor: alpha('#64748B', 0.15),
              maxWidth: '90%',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', textAlign: 'center', display: 'block' }}>
              {message.content}
            </Typography>
          </Paper>
        </Box>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          px: { xs: 1, sm: 2 },
          maxWidth: '850px',
          mx: 'auto',
          width: '100%',
        }}
      >
        {/* Avatar */}
        {!isUser && (
          <Tooltip title="FinChatBot AI">
            <Avatar
              variant="rounded"
              sx={{
                width: 32, height: 32, flexShrink: 0,
                bgcolor: '#10a37f', // ChatGPT green
                borderRadius: '8px',
              }}
            >
              <SmartToy sx={{ fontSize: 20, color: '#fff' }} />
            </Avatar>
          </Tooltip>
        )}

        {/* Bubble */}
        <Box sx={{ maxWidth: isUser ? '75%' : '100%', minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
          {/* Label */}
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.75,
              mb: 0.5, justifyContent: isUser ? 'flex-end' : 'flex-start',
            }}
          >
            {isUser ? null : (
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.875rem', color: 'text.primary', mb: 0.5 }}>
                FinChatBot
              </Typography>
            )}
            {isAssistant && (
              <Chip
                icon={<FeatureIcon sx={{ fontSize: 11 }} />}
                label={featureMeta[featureMode]?.label || 'AI'}
                size="small"
                sx={{
                  height: 18, fontSize: '0.6rem',
                  bgcolor: alpha(featureMeta[featureMode]?.color || '#7C3AED', 0.1),
                  color: featureMeta[featureMode]?.color || '#7C3AED',
                  '& .MuiChip-icon': { fontSize: 11, ml: 0.5 },
                }}
              />
            )}
          </Box>

          {/* Content */}
          <Paper
            elevation={0}
            sx={{
              p: isUser ? 1.5 : 0,
              px: isUser ? 2.5 : 0,
              borderRadius: isUser ? '24px' : 0,
              bgcolor: isUser ? (theme) => theme.palette.mode === 'dark' ? '#2f2f2f' : '#f4f4f4' : 'transparent',
              color: isUser ? 'text.primary' : 'inherit',
              position: 'relative',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              width: isAssistant ? '100%' : 'auto',
            }}
          >
            {isEditing ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  component="textarea"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  sx={{
                    width: '100%', minHeight: 80, p: 1,
                    fontSize: '0.875rem', fontFamily: 'Inter, sans-serif',
                    border: '1px solid', borderColor: 'divider',
                    borderRadius: 1.5, resize: 'vertical',
                    bgcolor: 'background.paper', color: 'text.primary',
                    outline: 'none',
                    '&:focus': { borderColor: 'primary.main' },
                  }}
                />
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={() => setIsEditing(false)}>
                    <Delete sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton size="small" color="primary" onClick={handleSaveEdit}>
                    <Check sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Box>
            ) : (
              <>
                <Box className="prose-chat">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code: CodeBlock,
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                      ),
                      table: ({ node, ...props }) => (
                        <div style={{ overflowX: 'auto', marginBottom: '0.75em' }}>
                          <table {...props} />
                        </div>
                      ),
                    }}
                  >
                    {cleanedContent}
                  </ReactMarkdown>
                </Box>
                {isAssistant && message.visualizationsData?.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <DataVisualization content="" data={message.visualizationsData} />
                  </>
                )}
              </>
            )}
          </Paper>

          {/* Actions */}
          {!isEditing && (
            <Box
              sx={{
                display: 'flex', gap: 0.25, mt: 0.5,
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                opacity: 0, transition: 'opacity 0.15s',
                '&:hover': { opacity: 1 },
              }}
              className="message-actions"
            >
              <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                <IconButton size="small" onClick={handleCopy} sx={{ width: 26, height: 26 }}>
                  {copied ? <Check sx={{ fontSize: 13, color: 'success.main' }} /> : <ContentCopy sx={{ fontSize: 13 }} />}
                </IconButton>
              </Tooltip>
              {isUser && (
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={handleEdit} sx={{ width: 26, height: 26 }}>
                    <Edit sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Share">
                <IconButton size="small" onClick={handleShare} sx={{ width: 26, height: 26 }}>
                  <Share sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
              {isAssistant && (
                <>
                  <Tooltip title="Regenerate">
                    <IconButton size="small" onClick={handleRegenerate} sx={{ width: 26, height: 26 }}>
                      <Refresh sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={isSpeaking ? 'Stop Reading' : 'Read Aloud'}>
                    <IconButton size="small" onClick={handleReadAloud} sx={{ width: 26, height: 26 }}>
                      {isSpeaking ? <Stop sx={{ fontSize: 13 }} /> : <VolumeUp sx={{ fontSize: 13 }} />}
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {isUser && (
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={handleDelete} sx={{ width: 26, height: 26, color: 'error.main' }}>
                    <Delete sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

export default Message;
