/**
 * Chat Page
 * Main chat interface — conversations, messages, feature selector.
 * Fully themed via CSS custom properties.
 */

import { useState, useEffect, useRef } from 'react';
import { Menu, Share2, LogOut, User, Shield, BarChart3, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { conversationAPI, documentAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Message from '../components/Message';
import ChatInput from '../components/ChatInput';
import FeatureSelector from '../components/FeatureSelector';
import { VoiceButton } from '../components/VoiceInput';
import ExportReports from '../components/ExportReports';
import SmartSuggestions from '../components/SmartSuggestions';

const ChatPage = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  // ---- State ----
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation]   = useState(null);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [selectedFeature, setSelectedFeature] = useState('Smart_Chat');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const userMenuRef    = useRef(null);

  // ---- Side effects ----
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
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---- Handlers ----
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const fetchConversations = async () => {
    try {
      const response = await conversationAPI.getAll();
      const convos   = response.data.data;
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
      setMessages(response.data.data.messages);
      setCurrentConversation(response.data.data.conversation);
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
      setSelectedFeature(newConvo.featureUsed || 'Smart_Chat');
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleSelectChat = async (id) => {
    setCurrentConversationId(id);
    setIsSidebarOpen(false);
    const conv = conversations.find((c) => c._id === id);
    if (conv) setSelectedFeature(conv.featureUsed || 'Smart_Chat');
  };

  const handleDeleteChat = async (id) => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await conversationAPI.delete(id);
      const updated = conversations.filter((c) => c._id !== id);
      setConversations(updated);
      if (currentConversationId === id) {
        updated.length > 0 ? setCurrentConversationId(updated[0]._id) : await handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleRenameChat = (id, newTitle) => {
    setConversations((prev) =>
      prev.map((c) => (c._id === id ? { ...c, title: newTitle } : c))
    );
    if (currentConversation?._id === id) {
      setCurrentConversation((prev) => ({ ...prev, title: newTitle }));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentConversationId || isLoading) return;

    const tempMessage = { _id: `temp-${Date.now()}`, role: 'user', content: input };
    setMessages((prev) => [...prev, tempMessage]);

    const messageContent  = input;
    const isFirstMessage  = messages.length === 0;
    setInput('');
    setIsLoading(true);

    try {
      await conversationAPI.sendMessage(currentConversationId, messageContent);

      // Auto-title on first message
      if (isFirstMessage) {
        const title = messageContent.length > 50 ? messageContent.substring(0, 47) + '…' : messageContent;
        try {
          await conversationAPI.update(currentConversationId, { title });
          setConversations((prev) =>
            prev.map((c) => (c._id === currentConversationId ? { ...c, title } : c))
          );
        } catch (err) {
          console.error('Failed to update title:', err);
        }
      }

      await fetchMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => [
        ...prev.filter((m) => m._id !== tempMessage._id),
        { _id: 'error', role: 'system', content: 'Failed to get response. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!currentConversationId || files.length === 0) return;

    const fileNames = files.map((f) => f.name).join(', ');
    const msgId = `upload-${Date.now()}`;

    // Stage 1: Uploading
    setMessages((prev) => [
      ...prev,
      { _id: msgId, role: 'system', content: `Uploading ${fileNames}...` },
    ]);

    let uploadedDocs = [];
    try {
      const res = await documentAPI.upload(currentConversationId, files);
      uploadedDocs = res.data.data?.documents || [];

      // Stage 2: Processing
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msgId
            ? { ...m, content: `Processing ${fileNames}... (large or scanned PDFs may take up to 2 minutes)` }
            : m
        )
      );

      // Stage 3: Poll until all docs are processed or failed
      if (uploadedDocs.length > 0) {
        const docIds = uploadedDocs.map((d) => d._id);
        let elapsed = 0;
        const INTERVAL = 2000; // Check every 2 seconds
        const TIMEOUT  = 120000;

        const poll = setInterval(async () => {
          elapsed += INTERVAL;
          try {
            const statusRes = await documentAPI.getByConversation(currentConversationId);
            const docs = statusRes.data.data || [];
            const relevant = docs.filter((d) => docIds.includes(d._id));
            
            if (relevant.length === 0) {
              // Documents not found yet, keep polling
              return;
            }

            const allDone   = relevant.every((d) => d.status === 'processed' || d.status === 'failed');
            const anyFailed = relevant.some((d) => d.status === 'failed');
            const allOk     = relevant.every((d) => d.status === 'processed');

            if (allDone) {
              clearInterval(poll);
              let finalMsg;
              if (allOk) {
                finalMsg = `✅ Analysis complete — ${fileNames} is ready. You can now ask questions about this document.`;
              } else if (anyFailed) {
                finalMsg = `⚠️ Warning: ${fileNames} processing completed with issues. Some pages may not be fully extracted.`;
              } else {
                finalMsg = `⚠️ ${fileNames} processing completed with mixed results.`;
              }
              setMessages((prev) =>
                prev.map((m) => m._id === msgId ? { ...m, content: finalMsg } : m)
              );
            } else if (elapsed >= TIMEOUT) {
              clearInterval(poll);
              setMessages((prev) =>
                prev.map((m) =>
                  m._id === msgId
                    ? { ...m, content: `⏱️ ${fileNames} is taking longer than expected. You can try asking questions — results may be partial.` }
                    : m
                )
              );
            }
          } catch (err) {
            console.error('Polling error:', err);
            // Continue polling on error
          }
        }, INTERVAL);
      }
    } catch (err) {
      console.error('File upload failed:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msgId
            ? { ...m, content: `❌ Failed to upload ${fileNames}. Please try again.` }
            : m
        )
      );
    }
  };

  const handleShare = () => {
    const text = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    navigator.clipboard.writeText(text).then(
      () => alert('Conversation copied to clipboard!'),
      () => alert('Failed to copy conversation')
    );
  };

  const handleFeatureChange = async (feature) => {
    if (!currentConversationId || isLoading) return;
    setSelectedFeature(feature);
    try {
      await conversationAPI.update(currentConversationId, { featureUsed: feature });
      setConversations((prev) =>
        prev.map((c) => (c._id === currentConversationId ? { ...c, featureUsed: feature } : c))
      );
    } catch (err) {
      console.error('Failed to update feature mode:', err);
    }
  };

  const handleVoiceTranscript = (transcript) => setInput(transcript);

  const handleSuggestionClick = (suggestion) => {
    if (!suggestion || isLoading || !currentConversationId) return;
    setInput(suggestion);
  };

  const handleMessageUpdate = (messageId, newContent) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg._id === messageId ? { ...msg, content: newContent } : msg
      )
    );
  };

  const handleMessageDelete = (messageId) => {
    setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
  };

  const handleRegenerateResponse = (data) => {
    // Remove all messages after the edited user message and add new response
    const userMessageId = data.userMessage._id;
    setMessages((prev) => {
      const userMsgIndex = prev.findIndex((m) => m._id === userMessageId);
      if (userMsgIndex === -1) return prev;
      
      // Keep messages up to and including the edited user message
      const updatedMessages = prev.slice(0, userMsgIndex + 1);
      // Update the user message content
      updatedMessages[userMsgIndex] = data.userMessage;
      // Add the new assistant response
      return [...updatedMessages, data.assistantMessage];
    });
  };

  // ---- Render ----
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-page)', color: 'var(--color-text-primary)' }}
    >
      {/* ---- Sidebar ---- */}
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

      {/* ---- Main Content ---- */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ---- Header ---- */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between
                     px-3 sm:px-4 md:px-6 py-3 sm:py-3.5 gap-3 sm:gap-4 glass z-10"
        >
          {/* Top row */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden icon-btn"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Brand */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  {/* FIXED: using <span> not <h1> here — h1 is reserved for page content */}
                  <span className="block text-sm sm:text-base font-bold gradient-text truncate leading-tight">
                    FinChatBot
                  </span>
                  <p className="text-xs hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
                    Financial Document Analysis
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile quick actions */}
            <div className="flex items-center gap-1 sm:hidden">
              {messages.length > 0 && (
                <ExportReports
                  messages={messages}
                  conversationTitle={currentConversation?.title || 'Chat'}
                />
              )}
              <button onClick={handleShare} className="icon-btn" title="Share">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4">
            {/* Feature selector */}
            <div className="flex-1 sm:flex-initial overflow-x-auto scrollbar-thin">
              <FeatureSelector
                selectedFeature={selectedFeature}
                onFeatureChange={handleFeatureChange}
                disabled={isLoading}
              />
            </div>

            {/* Desktop actions */}
            <div
              className="hidden sm:flex items-center gap-1.5 pl-4 flex-shrink-0 border-l"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {messages.length > 0 && (
                <ExportReports
                  messages={messages}
                  conversationTitle={currentConversation?.title || 'Chat'}
                />
              )}
              <button onClick={handleShare} className="icon-btn" title="Share conversation">
                <Share2 className="w-4 h-4" />
              </button>

              {/* User Menu */}
              <div className="relative ml-1" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl transition-all"
                  style={{ ':hover': { backgroundColor: 'var(--color-bg-hover)' } }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-sm select-none">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl border py-1.5 z-50 animate-fadeIn"
                    style={{
                      backgroundColor: 'var(--color-bg-surface)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {/* User info */}
                    <div
                      className="px-4 py-3 border-b"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {user?.name}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {user?.email}
                      </p>
                      <span
                        className="inline-block mt-1.5 px-2 py-0.5 text-xs rounded-full font-medium badge-blue"
                      >
                        {user?.role}
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => navigate('/admin')}
                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors"
                        style={{ color: 'var(--color-text-secondary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Shield className="w-4 h-4" />
                        Admin Dashboard
                      </button>
                    )}
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <BarChart3 className="w-4 h-4" />
                      My Dashboard
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors text-red-600"
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ---- Messages Area ---- */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">

            {/* Empty state */}
            {messages.length === 0 && !isLoading && (
              <div className="text-center mt-10 sm:mt-16 md:mt-20 px-2 animate-fadeInUp">
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 rounded-3xl flex items-center justify-center shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}
                >
                  <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
                </div>
                {/* SEMANTIC: h1 is the primary page heading when messages area is visible */}
                <h1
                  className="text-2xl sm:text-3xl font-bold mb-2"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Welcome to FinChatBot
                </h1>
                <p
                  className="text-sm sm:text-base mb-8 max-w-md mx-auto"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Your intelligent financial analysis platform. Upload documents or ask questions to get started.
                </p>

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
                  {[
                    { emoji: '📄', title: 'Upload Documents', desc: 'PDF, Excel, CSV files' },
                    { emoji: '💬', title: 'Ask Questions', desc: 'Get instant answers' },
                    { emoji: '📊', title: 'Analyze Data', desc: 'Financial insights' },
                  ].map(({ emoji, title, desc }) => (
                    <div key={title} className="card text-center py-5 sm:py-6">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto text-2xl"
                        style={{ backgroundColor: 'var(--color-primary-light)' }}
                      >
                        {emoji}
                      </div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {title}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <Message 
                key={msg._id} 
                message={msg}
                onMessageUpdate={handleMessageUpdate}
                onMessageDelete={handleMessageDelete}
                onRegenerateResponse={handleRegenerateResponse}
              />
            ))}

            {/* Smart suggestions */}
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
            {isLoading && messages.length > 0 && (
              <div className="flex gap-3 mb-6 animate-fadeIn">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md flex-shrink-0 self-end">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div
                  className="message-assistant inline-flex items-center gap-1.5 px-5 py-3.5"
                >
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce-dot" />
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce-dot" />
                  <span className="w-2 h-2 bg-blue-700 rounded-full animate-bounce-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* ---- Footer / Input ---- */}
        <footer
          className="p-3 sm:p-4 md:p-5 border-t"
          style={{
            backgroundColor: 'var(--color-bg-header)',
            borderColor: 'var(--color-border)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="max-w-4xl mx-auto">
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={handleSend}
              isLoading={isLoading}
              onFileUpload={handleFileUpload}
              onVoiceTranscript={handleVoiceTranscript}
            />
          </div>
        </footer>
      </div>

    </div>
  );
};

export default ChatPage;
