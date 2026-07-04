import { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, IconButton, TextField, InputAdornment,
  List, ListItemButton, ListItemText, ListItemIcon, Divider,
  Tooltip, Button, alpha, Badge,
} from '@mui/material';
import {
  Search, Add, Chat as ChatIcon, Delete, MoreHoriz,
  Edit, Check, Close, DragHandle, AutoAwesome,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@mui/material/styles';

const Sidebar = ({
  conversations,
  currentConversationId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const searchRef = useRef(null);
  const theme = useTheme();

  const filtered = conversations.filter((c) =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartEdit = (id, title) => {
    setEditingId(id);
    setEditValue(title);
  };

  const handleConfirmEdit = () => {
    if (editingId && editValue.trim()) {
      onRenameChat(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirmEdit();
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box
            sx={{
              width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
            }}
          >
            <AutoAwesome sx={{ color: '#fff', fontSize: 15 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ fontSize: '0.9rem', letterSpacing: '-0.02em' }}>
              Conversations
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem' }}>
              {conversations.length} total
            </Typography>
          </Box>
          <Tooltip title="New conversation">
            <Button
              variant="contained"
              size="small"
              onClick={onNewChat}
              sx={{
                minWidth: 0, width: 32, height: 32, p: 0, borderRadius: 1.5,
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              }}
            >
              <Add sx={{ fontSize: 18 }} />
            </Button>
          </Tooltip>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          inputRef={searchRef}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 16, color: 'text.disabled' }} />
              </InputAdornment>
            ),
            sx: { fontSize: '0.8125rem', height: 36 },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha(theme.palette.text.primary, 0.04),
              '&:hover': { backgroundColor: alpha(theme.palette.text.primary, 0.06) },
            },
          }}
        />
      </Box>

      <Divider />

      {/* Conversation list */}
      <List sx={{ flex: 1, overflowY: 'auto', px: 1, py: 0.5 }}>
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
              <ChatIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </Typography>
              {!searchQuery && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onNewChat}
                  startIcon={<Add />}
                  sx={{ borderRadius: 2 }}
                >
                  Start a chat
                </Button>
              )}
            </Box>
          ) : (
            filtered.map((conv, idx) => {
              const isActive = conv._id === currentConversationId;
              const isEditing = editingId === conv._id;

              return (
                <motion.div
                  key={conv._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                >
                  <ListItemButton
                    selected={isActive}
                    onClick={() => !isEditing && onSelectChat(conv._id)}
                    sx={{
                      borderRadius: 1.5, mb: 0.25, px: 1.25, py: 1,
                      flexDirection: 'column', alignItems: 'stretch',
                      transition: 'all 0.15s ease',
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
                      },
                      position: 'relative',
                    }}
                  >
                    {isEditing ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TextField
                          size="small"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': { height: 30, fontSize: '0.8125rem' },
                          }}
                        />
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleConfirmEdit(); }} color="primary">
                          <Check sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>
                          <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                          <ChatIcon sx={{ fontSize: 15, color: isActive ? 'primary.main' : 'text.disabled', flexShrink: 0 }} />
                          <Typography
                            variant="body2"
                            fontWeight={isActive ? 700 : 500}
                            noWrap
                            sx={{
                              flex: 1,
                              fontSize: '0.8125rem',
                              color: isActive ? 'primary.main' : 'text.primary',
                            }}
                          >
                            {conv.title || 'New Chat'}
                        </Typography>
                         </Box>
                      </>
                    )}


                    {/* Hover actions */}
                    {!isEditing && (
                      <Box
                        className="sidebar-actions"
                        sx={{
                          position: 'absolute', right: 6, top: 6,
                          display: 'none', gap: 0.25,
                          bgcolor: isActive
                            ? alpha(theme.palette.primary.main, 0.12)
                            : alpha(theme.palette.background.paper, 0.9),
                          borderRadius: 1, p: 0.25,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(conv._id, conv.title); }}
                          sx={{ width: 24, height: 24 }}
                        >
                          <Edit sx={{ fontSize: 13 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); onDeleteChat(conv._id, conv.title); }}
                          sx={{ width: 24, height: 24, color: 'error.main' }}
                        >
                          <Delete sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Box>
                    )}
                  </ListItemButton>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </List>

      <style>{`
        .Mui-selected .sidebar-actions { display: flex !important; }
        .MuiListItemButton-root:hover .sidebar-actions { display: flex !important; }
      `}</style>
    </Box>
  );
};

export default Sidebar;
