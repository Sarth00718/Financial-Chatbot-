/**
 * Chat Page
 * Proper chatbot layout — full-height, message area scrolls independently,
 * input pinned at the bottom. All handlers / API / socket logic unchanged.
 */

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Box, Stack, Typography, IconButton, Avatar, Menu, MenuItem,
  ListItemIcon, ListItemText, Divider, Chip, Tooltip, Paper, Container,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, alpha,
} from '@mui/material';
import {
  Menu as MenuIcon, Share, Logout, AdminPanelSettings, Insights,
  Bookmark, Visibility, Dashboard, SmartToy, Description,
  QuestionAnswer, BarChart, ContentCopy, TrendingUp, Forum,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { conversationAPI, documentAPI, BACKEND_ORIGIN } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Message from '../components/Message';
import ChatInput from '../components/ChatInput';
import FeatureSelector from '../components/FeatureSelector';
import ExportReports from '../components/ExportReports';
import SmartSuggestions from '../components/SmartSuggestions';
import EnterpriseInsights from '../components/EnterpriseInsights';
import { ChatSkeleton } from '../components/ui/LoadingSkeleton';

const FEATURE_UI_META = {
  Smart_Chat: {
    label: 'Smart Chat',
    description: 'Blend document context with interactive conversation to answer complex business questions.',
    placeholder: 'Ask a smart finance question or reference your uploaded document…',
    helpText: 'Smart Chat provides context-aware answers by combining your uploaded documents with conversational history.',
    examples: [
      'What does the latest cash flow say about liquidity?',
      'Compare revenue drivers across the uploaded filings.',
      'Summarize the most material risks from the document.'
    ],
    color: '#2563EB',
    icon: QuestionAnswer,
  },
  Document_Analysis: {
    label: 'Document Analysis',
    description: 'Inspect uploaded financial documents and extract precise details, citations, and summaries.',
    placeholder: 'Ask about uploaded documents, tables, disclosures, or line items…',
    helpText: 'Document Analysis is optimized for reading PDFs, spreadsheets, and filings to deliver evidence-backed results.',
    examples: [
      'What was the operating income in Q1 FY25?',
      'Which page mentions revenue growth assumptions?',
      'Extract the key balance sheet figures.'
    ],
    color: '#16A34A',
    icon: Description,
  },
  Analytical_Insights: {
    label: 'Analytical Insights',
    description: 'Generate charts, trends, KPIs and executive summaries for financial decision-making.',
    placeholder: 'Request charts, trend analysis, KPIs, or executive insights…',
    helpText: 'Analytical Insights focuses on visual analytics and business intelligence for financial performance.',
    examples: [
      'Show revenue and margin trends over the last five quarters.',
      'Generate a KPI summary for operating margin and net margin.',
      'Compare Y-o-Y growth and Y-o-Y growth CC.'
    ],
    color: '#7C3AED',
    icon: TrendingUp,
  },
  General_Conversation: {
    label: 'General Conversation',
    description: 'Discuss finance topics, strategy, and general business concepts with an expert tone.',
    placeholder: 'Ask a general finance or strategy question…',
    helpText: 'General Conversation is best for high-level finance, strategy, and conceptual discussions.',
    examples: [
      'What are the key drivers of EBITDA?',
      'Explain the difference between operating margin and net margin.',
      'How should I think about FY25 growth risks?'
    ],
    color: '#64748B',
    icon: Forum,
  },
};

const normalizeFeatureMode = (feature) => (typeof feature === 'string' ? feature.trim() : 'Smart_Chat');
const ENTERPRISE_ANALYSIS_MODES = ['Document_Analysis', 'Analytical_Insights'];

const TypingDot = ({ delay }) => (
  <Box
    sx={{
      width: 7,
      height: 7,
      borderRadius: '50%',
      bgcolor: 'primary.main',
      opacity: 0.7,
      animation: 'typingBounce 1.2s ease-in-out infinite',
      animationDelay: delay,
      '@keyframes typingBounce': {
        '0%, 80%, 100%': { transform: 'translateY(0)' },
        '40%': { transform: 'translateY(-6px)' },
      },
    }}
  />
);

const ChatPage = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  // ── State (unchanged) ──
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [selectedFeature, setSelectedFeature] = useState('Smart_Chat');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ id: null, title: '' });
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ── Side effects (unchanged) ──
  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    if (currentConversationId) fetchMessages();
  }, [currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const socketUrl = BACKEND_ORIGIN || window.location.origin;
    const socket = io(socketUrl, { withCredentials: true, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => { setSocketConnected(true); setSocketError(''); });
    socket.on('connect_error', (error) => {
      setSocketConnected(false);
      setSocketError(error.message || 'Unable to connect to chat server');
    });
    socket.on('disconnect', () => {
      setSocketConnected(false);
      setSocketError('Chat connection disconnected');
    });
    socket.on('newMessage', (message) => {
      setMessages((prev) => {
        if (prev.some((e) => e._id === message._id)) return prev;
        return [...prev, message];
      });
      if (message.role === 'assistant') setIsLoading(false);
    });

    socket.on('documentStatusUpdated', ({ documentId, status, errorMessage, fileName, statusMessage }) => {
      setCurrentConversation((prev) => {
        if (!prev) return prev;

        const existingDocs = prev.documents || [];
        const documentIndex = existingDocs.findIndex((doc) => doc._id === documentId);
        const updatedDocuments = [...existingDocs];

        if (documentIndex === -1) {
          updatedDocuments.push({
            _id: documentId,
            fileName,
            status,
            errorMessage: errorMessage || null,
          });
        } else {
          updatedDocuments[documentIndex] = {
            ...updatedDocuments[documentIndex],
            status,
            errorMessage: errorMessage || updatedDocuments[documentIndex].errorMessage,
          };
        }

        return {
          ...prev,
          documents: updatedDocuments,
        };
      });

      const newContent =
        status === 'processed'
          ? `✅ ${fileName} is ready — you can now ask questions about this document.`
          : `❌ Failed to process file: ${fileName}. ${errorMessage || ''}`;

      setMessages((prev) => updateFileStatusMessage(prev, fileName, newContent, statusMessage));
    });

    socket.on('chatError', ({ message }) => {
      setMessages((prev) => [
        ...prev,
        { _id: `error-${Date.now()}`, role: 'system', content: message || 'Chat failed. Please try again.' },
      ]);
      setIsLoading(false);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, []);

  useEffect(() => {
    if (!socketRef.current || !currentConversationId) return;
    socketRef.current.emit('joinConversation', currentConversationId);
    return () => { socketRef.current?.emit('leaveConversation', currentConversationId); };
  }, [currentConversationId]);

  // ── Handlers (unchanged) ──
  const handleLogout = async () => { await logout(); navigate('/login'); };

  const fetchConversations = async () => {
    try {
      const response = await conversationAPI.getAll();
      const convos = response.data.data;
      setConversations(convos);
      if (convos.length > 0) {
        setCurrentConversationId(convos[0]._id);
      } else {
        await handleNewChat();
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const fetchMessages = async () => {
    if (!currentConversationId) return;
    try {
      setIsLoading(true);
      const response = await conversationAPI.getById(currentConversationId);
      const { messages: fetchedMessages, conversation: fetchedConversation } = response.data.data;
      setMessages(fetchedMessages);
      setCurrentConversation(fetchedConversation);
      if (typeof fetchedConversation?.featureUsed === 'string' && fetchedConversation.featureUsed.trim() !== '') {
        setSelectedFeature(normalizeFeatureMode(fetchedConversation.featureUsed));
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setMessages([{ _id: 'error', role: 'system', content: 'Failed to load messages.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await conversationAPI.create({ title: 'New Chat', featureUsed: selectedFeature });
      const newConvo = response.data.data;
      setConversations((prev) => [newConvo, ...prev]);
      setCurrentConversationId(newConvo._id);
      setMessages([]);
      if (typeof newConvo.featureUsed === 'string' && newConvo.featureUsed.trim() !== '') {
        setSelectedFeature(normalizeFeatureMode(newConvo.featureUsed));
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleSelectChat = async (id) => {
    setCurrentConversationId(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    const conv = conversations.find((c) => c._id === id);
    if (conv && typeof conv.featureUsed === 'string' && conv.featureUsed.trim() !== '') {
      setSelectedFeature(normalizeFeatureMode(conv.featureUsed));
    }
  };

  const handleDeleteChat = (id, title) => {
    setDeleteTarget({ id, title });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteChat = async () => {
    const { id } = deleteTarget;
    setDeleteDialogOpen(false);
    if (!id) return;

    try {
      await conversationAPI.delete(id);
      const updated = conversations.filter((c) => c._id !== id);
      setConversations(updated);
      if (currentConversationId === id) {
        updated.length > 0 ? setCurrentConversationId(updated[0]._id) : await handleNewChat();
      }
      toast.success('Conversation deleted');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      toast.error('Failed to delete conversation');
    } finally {
      setDeleteTarget({ id: null, title: '' });
    }
  };

  const handleCancelDeleteChat = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget({ id: null, title: '' });
  };

  const handleRenameChat = (id, newTitle) => {
    setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, title: newTitle } : c)));
    if (currentConversation?._id === id) {
      setCurrentConversation((prev) => ({ ...prev, title: newTitle }));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentConversationId || isLoading) return;
    const messageContent = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('sendMessage', { conversationId: currentConversationId, content: messageContent });
      } else {
        await conversationAPI.sendMessage(currentConversationId, messageContent);
        await fetchMessages();
        setIsLoading(false);
      }

      const isFirstMessage = messages.length === 0;
      if (isFirstMessage) {
        const title = messageContent.length > 50 ? `${messageContent.substring(0, 47)}…` : messageContent;
        try {
          await conversationAPI.update(currentConversationId, { title });
          setConversations((prev) => prev.map((c) => (c._id === currentConversationId ? { ...c, title } : c)));
        } catch (err) {
          console.error('Failed to update title:', err);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => [
        ...prev,
        { _id: `error-${Date.now()}`, role: 'system', content: 'Failed to get response. Please try again.' },
      ]);
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!currentConversationId || files.length === 0) return;
    const fileNames = files.map((f) => f.name).join(', ');
    const msgId = `upload-${Date.now()}`;

    setMessages((prev) => [...prev, { _id: msgId, role: 'system', content: `Uploading ${fileNames}…` }]);

    let uploadedDocs = [];
    try {
      const res = await documentAPI.upload(currentConversationId, files);
      uploadedDocs = res.data.data || [];

      setMessages((prev) => prev.map((m) =>
        m._id === msgId
          ? { ...m, content: `Processing ${fileNames}… (large or scanned PDFs may take up to 2 minutes)` }
          : m
      ));

      if (uploadedDocs.length > 0) {
        setCurrentConversation((prev) => {
          if (!prev) return prev;
          const existingDocs = prev.documents || [];
          const mergedDocs = [...existingDocs];
          uploadedDocs.forEach((doc) => {
            if (!mergedDocs.some((existing) => existing._id === doc._id)) {
              mergedDocs.push(doc);
            }
          });
          return {
            ...prev,
            documents: mergedDocs,
          };
        });

        const docIds = uploadedDocs.map((d) => d._id);
        let elapsed = 0;
        const INTERVAL = 2000;
        const TIMEOUT = 120000;

        const poll = setInterval(async () => {
          elapsed += INTERVAL;
          try {
            const statusRes = await documentAPI.getByConversation(currentConversationId);
            const docs = statusRes.data.data || [];
            const relevant = docs.filter((d) => docIds.includes(d._id));
            if (relevant.length === 0) return;

            const allDone = relevant.every((d) => d.status === 'processed' || d.status === 'failed');
            const anyFailed = relevant.some((d) => d.status === 'failed');
            const allOk = relevant.every((d) => d.status === 'processed');

            if (allDone) {
              clearInterval(poll);
              let finalMsg;
              if (allOk) finalMsg = `✅ ${fileNames} is ready — you can now ask questions about this document.`;
              else if (anyFailed) finalMsg = `⚠️ ${fileNames} completed with issues. Some pages may not be fully extracted.`;
              else finalMsg = `⚠️ ${fileNames} processing completed with mixed results.`;
              setMessages((prev) => prev.map((m) => (m._id === msgId ? { ...m, content: finalMsg } : m)));
            } else if (elapsed >= TIMEOUT) {
              clearInterval(poll);
              setMessages((prev) => prev.map((m) =>
                m._id === msgId
                  ? { ...m, content: `⏱️ ${fileNames} is taking longer than expected. Results may be partial.` }
                  : m
              ));
            }
          } catch (err) {
            console.error('Polling error:', err);
          }
        }, INTERVAL);
      }
    } catch (err) {
      console.error('File upload failed:', err);
      setMessages((prev) => prev.map((m) =>
        m._id === msgId ? { ...m, content: `❌ Failed to upload ${fileNames}. Please try again.` } : m
      ));
    }
  };

  const handleShare = () => {
    const text = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success('Conversation copied to clipboard'),
      () => toast.error('Failed to copy conversation')
    );
  };

  const handleFeatureChange = async (feature) => {
    if (!currentConversationId || isLoading) return;
    const normalizedFeature = normalizeFeatureMode(feature);
    setSelectedFeature(normalizedFeature);
    setCurrentConversation((prev) =>
      prev?._id === currentConversationId ? { ...prev, featureUsed: normalizedFeature } : prev
    );
    try {
      await conversationAPI.update(currentConversationId, { featureUsed: feature });
      setConversations((prev) =>
        prev.map((c) => (c._id === currentConversationId ? { ...c, featureUsed: feature } : c))
      );
    } catch (err) {
      console.error('Failed to update feature mode:', err);
    }
  };

  const getFileStatusMessageIndex = (messages, fileName) =>
    messages.findIndex((m) =>
      m.role === 'system' &&
      typeof m.content === 'string' &&
      m.content.includes(fileName)
    );

  const updateFileStatusMessage = (messages, fileName, newContent, statusMessage = null) => {
    const index = getFileStatusMessageIndex(messages, fileName);
    if (index !== -1) {
      const updated = [...messages];
      updated[index] = { ...updated[index], content: newContent };
      return updated;
    }

    const newMessage = statusMessage
      ? { ...statusMessage }
      : {
          _id: `doc-status-${Date.now()}-${fileName}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'system',
          content: newContent,
        };

    return [...messages, newMessage];
  };

  const handleVoiceTranscript = (transcript) => setInput(transcript);

  const handleSuggestionClick = (suggestion) => {
    if (!suggestion || isLoading || !currentConversationId) return;
    setInput(suggestion);
  };

  const handleMessageUpdate = (messageId, newContent) => {
    setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, content: newContent } : msg)));
  };

  const handleMessageDelete = (messageId) => {
    setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
  };

  const handleRegenerateResponse = (data) => {
    const userMessageId = data.userMessage._id;
    setMessages((prev) => {
      const userMsgIndex = prev.findIndex((m) => m._id === userMessageId);
      if (userMsgIndex === -1) return prev;
      const updated = prev.slice(0, userMsgIndex + 1);
      updated[userMsgIndex] = data.userMessage;
      return [...updated, data.assistantMessage];
    });
  };

  // ── Render ──
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>

      {/* ── Sidebar ── */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <Dialog open={deleteDialogOpen} onClose={handleCancelDeleteChat} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Conversation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteTarget.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCancelDeleteChat} variant="outlined">Cancel</Button>
          <Button onClick={handleConfirmDeleteChat} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* ── Main column ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >

        {/* ── Top bar ── */}
        <Box
          component="header"
          sx={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            px: { xs: 1.5, md: 2 },
            gap: 1,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {/* Mobile hamburger */}
          <IconButton
            size="small"
            onClick={() => setIsSidebarOpen(true)}
            sx={{ display: { md: 'none' }, mr: 0.5 }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          {/* Bot identity */}
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              flexShrink: 0,
            }}
          >
            <SmartToy sx={{ color: '#fff', fontSize: 16 }} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={800} lineHeight={1.1} noWrap>
              FinChatBot
            </Typography>
            <Typography variant="caption" color="text.secondary" lineHeight={1} noWrap
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              Enterprise
            </Typography>
          </Box>

          {/* Connection status dot */}
          <Tooltip title={socketConnected ? 'Live — real-time connected' : socketError || 'Real-time unavailable'}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: socketConnected ? 'success.main' : 'text.disabled',
                flexShrink: 0,
                ml: 0.5,
                transition: 'background-color 0.3s',
              }}
            />
          </Tooltip>

          {/* Feature selector — grows to fill middle */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', px: 1 }}>
            <FeatureSelector
              selectedFeature={selectedFeature}
              onFeatureChange={handleFeatureChange}
              disabled={isLoading}
            />
          </Box>

          {/* Right actions */}
          <Stack direction="row" alignItems="center" gap={0.5} flexShrink={0}>
            {messages.length > 0 && (
              <ExportReports
                messages={messages}
                conversationTitle={currentConversation?.title || 'Chat'}
              />
            )}

            {messages.length > 0 && (
              <Tooltip title="Copy conversation">
                <IconButton size="small" onClick={handleShare}>
                  <ContentCopy sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}

            {/* User avatar + menu */}
            <IconButton
              size="small"
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              sx={{ ml: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 30,
                  height: 30,
                  fontSize: '0.8rem',
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase()}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{ sx: { mt: 0.5, minWidth: 220 } }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="body2" fontWeight={700}>{user?.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {user?.email}
                </Typography>
                <Chip
                  size="small"
                  label={user?.role}
                  color="primary"
                  variant="outlined"
                  sx={{ mt: 0.75, height: 20, fontSize: '0.7rem' }}
                />
              </Box>
              <Divider />
              {isAdmin && (
                <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/admin'); }}>
                  <ListItemIcon><AdminPanelSettings fontSize="small" /></ListItemIcon>
                  <ListItemText>Admin dashboard</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/executive'); }}>
                <ListItemIcon><Insights fontSize="small" /></ListItemIcon>
                <ListItemText>Executive dashboard</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/bookmarks'); }}>
                <ListItemIcon><Bookmark fontSize="small" /></ListItemIcon>
                <ListItemText>Bookmarks</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/watchlist'); }}>
                <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
                <ListItemText>Watchlist</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/dashboard'); }}>
                <ListItemIcon><Dashboard fontSize="small" /></ListItemIcon>
                <ListItemText>My dashboard</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Log out</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>
        </Box>

        {/* ── Message area ── */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { borderRadius: 4, bgcolor: 'divider' },
          }}
        >
          <Container
            maxWidth="md"
            sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 } }}
          >

            {/* Empty state */}
            {messages.length === 0 && !isLoading && (
              <Box
                component={motion.div}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                sx={{ textAlign: 'center', pt: { xs: 6, md: 10 }, pb: 4 }}
              >
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    mx: 'auto',
                    mb: 3,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)',
                  }}
                >
                  <Insights sx={{ fontSize: 36, color: 'primary.main' }} />
                </Box>

                <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
                  Ask anything about your finances
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 4, maxWidth: 420, mx: 'auto', lineHeight: 1.6 }}
                >
                  Upload a document or type a question to get started.
                </Typography>
              </Box>
            )}

            {/* Loading skeleton (first load) */}
            {messages.length === 0 && isLoading && <ChatSkeleton />}

            {/* Messages */}
            {messages.map((msg) => (
              <Message
                key={msg._id}
                message={msg}
                featureMode={selectedFeature}
                onMessageUpdate={handleMessageUpdate}
                onMessageDelete={handleMessageDelete}
                onRegenerateResponse={handleRegenerateResponse}
              />
            ))}

            {/* Smart suggestions after last AI reply */}
            {messages.length > 0 &&
              messages[messages.length - 1].role === 'assistant' &&
              !isLoading && (
                <SmartSuggestions
                  lastMessage={messages[messages.length - 1]}
                  documents={currentConversation?.documents || []}
                  onSuggestionClick={handleSuggestionClick}
                  disabled={isLoading}
                />
              )}

            {/* Typing indicator */}
            <AnimatePresence>
              {isLoading && messages.length > 0 && (
                <Stack
                  component={motion.div}
                  key="typing"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  direction="row"
                  alignItems="flex-end"
                  gap={1.5}
                  sx={{ mb: 3 }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                      flexShrink: 0,
                    }}
                  >
                    <Insights sx={{ fontSize: 16 }} />
                  </Avatar>

                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: '18px 18px 18px 4px',
                      px: 2,
                      py: 1.25,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                    }}
                  >
                    <TypingDot delay="0s" />
                    <TypingDot delay="0.2s" />
                    <TypingDot delay="0.4s" />
                  </Paper>
                </Stack>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </Container>
        </Box>

        {/* ── Enterprise analysis panel (above input) ── */}
        {currentConversationId && (
          <EnterpriseInsights
            conversationId={currentConversationId}
            hasDocuments={
              currentConversation?.documents?.some((d) => d.status === 'processed') ?? false
            }
          />
        )}

        {/* ── Input bar (pinned bottom) ── */}
        <Box
          component="footer"
          sx={{
            flexShrink: 0,
            bgcolor: 'background.paper',
            px: { xs: 1.5, md: 2 },
            py: 1.5,
          }}
        >
          <Container maxWidth="md" disableGutters>
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={handleSend}
              isLoading={isLoading}
              onFileUpload={handleFileUpload}
              onVoiceTranscript={handleVoiceTranscript}
              placeholder={FEATURE_UI_META[selectedFeature]?.placeholder}
              modeColor={FEATURE_UI_META[selectedFeature]?.color}
            />
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatPage;