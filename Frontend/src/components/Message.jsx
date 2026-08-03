import { useState } from 'react';
import {
  Box, Avatar, Typography, Paper, IconButton, Tooltip, Menu, MenuItem,
  ListItemIcon, ListItemText, Chip, Collapse, alpha, Divider,
} from '@mui/material';
import DataVisualization from './DataVisualization.jsx';
import {
  ContentCopy, Edit, Delete, Refresh, ThumbUp, ThumbDown,
  Bookmark, Share, Check, MoreHoriz, SmartToy, Person,
  Description, TrendingUp, Forum,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
              if (ch === '"') break;
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
      await messageAPI.delete(message._id);
      onMessageDelete(message._id);
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
          gap: 1.5,
          mb: 2.5,
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          px: { xs: 0.5, sm: 1 },
        }}
      >
        {/* Avatar */}
        <Tooltip title={isUser ? 'You' : 'FinChatBot AI'}>
          <Avatar
            sx={{
              width: 32, height: 32, flexShrink: 0,
              bgcolor: isUser ? 'primary.main' : alpha('#7C3AED', 0.9),
              boxShadow: `0 2px 8px ${alpha(config.color, 0.25)}`,
            }}
          >
            {Icon ? <Icon sx={{ fontSize: 16 }} /> : <SmartToy sx={{ fontSize: 16 }} />}
          </Avatar>
        </Tooltip>

        {/* Bubble */}
        <Box sx={{ maxWidth: '75%', minWidth: 0 }}>
          {/* Label */}
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.75,
              mb: 0.5, justifyContent: isUser ? 'flex-end' : 'flex-start',
            }}
          >
            <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.7rem', color: config.color }}>
              {isUser ? 'You' : 'FinChatBot'}
            </Typography>
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
            variant="outlined"
            sx={{
              p: 1.75,
              borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              bgcolor: isUser
                ? alpha('#2563EB', 0.08)
                : alpha('#7C3AED', 0.04),
              borderColor: isUser
                ? alpha('#2563EB', 0.15)
                : alpha('#7C3AED', 0.1),
              position: 'relative',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              transition: 'box-shadow 0.15s ease',
              '&:hover': {
                boxShadow: `0 2px 12px ${alpha(config.color, 0.06)}`,
              },
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
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: CodeBlock,
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
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
              {isAssistant && (
                <Tooltip title="Regenerate">
                  <IconButton size="small" onClick={handleRegenerate} sx={{ width: 26, height: 26 }}>
                    <Refresh sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="More">
                <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ width: 26, height: 26 }}>
                  <MoreHoriz sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{ paper: { sx: { minWidth: 160, mt: 0.25 } } }}
          >
            <MenuItem onClick={handleCopy} dense>
              <ListItemIcon><ContentCopy sx={{ fontSize: 16 }} /></ListItemIcon>
              <ListItemText>Copy</ListItemText>
            </MenuItem>
            {isUser && (
              <MenuItem onClick={handleEdit} dense>
                <ListItemIcon><Edit sx={{ fontSize: 16 }} /></ListItemIcon>
                <ListItemText>Edit</ListItemText>
              </MenuItem>
            )}
            {isAssistant && (
              <MenuItem onClick={handleRegenerate} dense>
                <ListItemIcon><Refresh sx={{ fontSize: 16 }} /></ListItemIcon>
                <ListItemText>Regenerate</ListItemText>
              </MenuItem>
            )}
            <MenuItem onClick={handleDelete} dense sx={{ color: 'error.main' }}>
              <ListItemIcon><Delete sx={{ fontSize: 16, color: 'error.main' }} /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </motion.div>
  );
};

export default Message;
