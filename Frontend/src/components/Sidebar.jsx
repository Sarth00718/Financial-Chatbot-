/**
 * Sidebar
 * Conversation list with search, rename, and delete — pure MUI.
 */

import { useState, useEffect } from 'react';
import {
  Box, Drawer, Stack, Typography, IconButton, TextField, InputAdornment,
  List, ListItemButton, ListItemAvatar, ListItemText, Avatar, Tooltip,
  CircularProgress, useMediaQuery, useTheme as useMuiTheme,
} from '@mui/material';
import {
  Add, Close, Search, Chat as ChatIcon, Edit, Delete, Check, Insights,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { conversationAPI } from '../utils/api';
import ThemeToggle from './ThemeToggle';
import toast from 'react-hot-toast';

const DRAWER_WIDTH = 300;

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
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await conversationAPI.search(searchQuery);
        setSearchResults(response.data.data?.conversations || []);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const displayedConversations = searchQuery.trim() ? searchResults : conversations;

  const handleStartEdit = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv._id);
    setEditTitle(conv.title);
  };

  const handleSaveEdit = async (convId, e) => {
    e?.stopPropagation();
    if (!editTitle.trim() || editTitle === conversations.find((c) => c._id === convId)?.title) {
      setEditingId(null);
      return;
    }
    try {
      await conversationAPI.update(convId, { title: editTitle.trim() });
      onRenameChat?.(convId, editTitle.trim());
      setEditingId(null);
      toast.success('Chat renamed');
    } catch (error) {
      console.error('Failed to rename chat:', error);
      toast.error('Failed to rename chat');
    }
  };

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 2.5,
              background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Insights sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} lineHeight={1.1}>FinChatBot</Typography>
            <Typography variant="caption" color="text.secondary">Enterprise</Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" gap={0.5}>
          <ThemeToggle size="small" />
          <IconButton size="small" onClick={onClose} sx={{ display: { md: 'none' } }}>
            <Close fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Box
          component={motion.button}
          whileTap={{ scale: 0.98 }}
          onClick={onNewChat}
          sx={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
            py: 1.25, borderRadius: 2.5, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#fff',
            fontWeight: 600, fontSize: '0.875rem',
          }}
        >
          <Add fontSize="small" /> New Conversation
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ px: 2, pb: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
            endAdornment: isSearching && (
              <InputAdornment position="end"><CircularProgress size={14} /></InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Conversation list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5 }}>
        {displayedConversations.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 6, px: 2 }}>
            <ChatIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? 'No results found' : 'No conversations yet'}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {displayedConversations.map((conv) => {
              const isActive = currentConversationId === conv._id;
              return (
                <ListItemButton
                  key={conv._id}
                  selected={isActive}
                  onClick={() => editingId !== conv._id && onSelectChat(conv._id)}
                  sx={{ mb: 0.5, py: 1, pr: editingId === conv._id ? 1 : 9, position: 'relative', '&:hover .conv-actions': { opacity: 1 } }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar
                      sx={{
                        width: 32, height: 32,
                        bgcolor: isActive ? 'primary.main' : 'action.hover',
                        color: isActive ? '#fff' : 'text.secondary',
                      }}
                    >
                      <ChatIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                  </ListItemAvatar>
                  {editingId === conv._id ? (
                    <TextField
                      size="small"
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(conv._id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      sx={{ flex: 1 }}
                    />
                  ) : (
                    <ListItemText
                      primary={conv.title}
                      secondary={new Date(conv.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      primaryTypographyProps={{ noWrap: true, fontSize: '0.8125rem', fontWeight: isActive ? 700 : 500 }}
                      secondaryTypographyProps={{ fontSize: '0.6875rem' }}
                    />
                  )}
                  {editingId !== conv._id && (
                    <Stack
                      direction="row"
                      className="conv-actions"
                      sx={{ position: 'absolute', right: 8, opacity: 0, transition: 'opacity 0.15s' }}
                    >
                      <Tooltip title="Rename">
                        <IconButton size="small" onClick={(e) => handleStartEdit(conv, e)}>
                          <Edit sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDeleteChat(conv._id, conv.title); }}>
                          <Delete sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                  {editingId === conv._id && (
                    <IconButton size="small" color="success" onClick={(e) => handleSaveEdit(conv._id, e)}>
                      <Check sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>

      <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">FinChatBot Enterprise · Financial Document Analysis</Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      open={isOpen}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: isOpen && !isMobile ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        transition: 'width 0.2s ease',
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          position: { xs: 'fixed', md: 'relative' },
          height: '100%',
        },
      }}
    >
      {content}
    </Drawer>
  );
};

export default Sidebar;
