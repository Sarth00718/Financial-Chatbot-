/**
 * Chat Page
 * Main chat interface with conversations and messages
 */

import { useState, useEffect, useRef } from 'react';
import { Menu, Download, Share2, Bot, FileText, BarChart3 } from 'lucide-react';
import { conversationAPI, documentAPI } from '../utils/api';
import Sidebar from '../components/Sidebar';
import Message from '../components/Message';
import ChatInput from '../components/ChatInput';
import DocumentPreview from '../components/DocumentPreview';
import { useNavigate } from 'react-router-dom';

const ChatPage = () => {
  // State
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);
  
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      fetchMessages();
    }
  }, [currentConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Fetch all conversations
   */
  const fetchConversations = async () => {
    try {
      const response = await conversationAPI.getAll();
      const convos = response.data.data;
      setConversations(convos);

      // Select first conversation or create new one
      if (convos.length > 0) {
        setCurrentConversationId(convos[0]._id);
      } else {
        await handleNewChat();
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  /**
   * Fetch messages for current conversation
   */
  const fetchMessages = async () => {
    if (!currentConversationId) return;

    try {
      setIsLoading(true);
      const response = await conversationAPI.getById(currentConversationId);
      setMessages(response.data.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setMessages([
        {
          _id: 'error',
          role: 'system',
          content: 'Failed to load messages.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create new conversation
   */
  const handleNewChat = async () => {
    try {
      const response = await conversationAPI.create({ title: 'New Chat' });
      const newConvo = response.data.data;
      setConversations((prev) => [newConvo, ...prev]);
      setCurrentConversationId(newConvo._id);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  /**
   * Select conversation
   */
  const handleSelectChat = (id) => {
    setCurrentConversationId(id);
    setIsSidebarOpen(false); // Close sidebar on mobile
  };

  /**
   * Delete conversation
   */
  const handleDeleteChat = async (id) => {
    if (!window.confirm('Delete this conversation?')) return;

    try {
      await conversationAPI.delete(id);
      const updated = conversations.filter((c) => c._id !== id);
      setConversations(updated);

      // Select another conversation or create new one
      if (currentConversationId === id) {
        if (updated.length > 0) {
          setCurrentConversationId(updated[0]._id);
        } else {
          await handleNewChat();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  /**
   * Rename conversation
   */
  const handleRenameChat = async (id, newTitle) => {
    try {
      await conversationAPI.update(id, { title: newTitle });
      setConversations((prev) =>
        prev.map((c) => (c._id === id ? { ...c, title: newTitle } : c))
      );
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      alert('Failed to rename conversation');
    }
  };

  /**
   * Send message
   */
  const handleSend = async () => {
    if (!input.trim() || !currentConversationId || isLoading) return;

    // Add temporary user message
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, tempMessage]);

    const messageContent = input;
    setInput('');
    setIsLoading(true);

    try {
      // Send message to backend
      await conversationAPI.sendMessage(currentConversationId, messageContent);
      
      // Refetch messages to get AI response
      await fetchMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev.filter((m) => m._id !== tempMessage._id),
        {
          _id: 'error',
          role: 'system',
          content: 'Failed to get response. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Upload files
   */
  const handleFileUpload = async (files) => {
    if (!currentConversationId || files.length === 0) return;

    const fileNames = files.map((f) => f.name).join(', ');
    const systemMessage = {
      _id: `upload-${Date.now()}`,
      role: 'system',
      content: `Uploading ${fileNames}...`,
    };
    setMessages((prev) => [...prev, systemMessage]);

    try {
      await documentAPI.upload(currentConversationId, files);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === systemMessage._id
            ? { ...m, content: `${fileNames} uploaded successfully. Processing...` }
            : m
        )
      );
    } catch (error) {
      console.error('File upload failed:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === systemMessage._id
            ? { ...m, content: `Failed to upload ${fileNames}` }
            : m
        )
      );
    }
  };

  /**
   * Export conversation
   */
  const handleExport = () => {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-${currentConversationId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Share conversation
   */
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 text-gray-900">
      {/* Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">
                  Financial AI Assistant
                </h1>
                <p className="text-xs text-gray-500">Powered by Google Gemini</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDocumentPreviewOpen(true)}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
              title="View documents"
            >
              <FileText className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
              title="View analytics"
            >
              <BarChart3 className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
            </button>
            <button
              onClick={handleShare}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
              title="Share conversation"
            >
              <Share2 className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
            </button>
            <button
              onClick={handleExport}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
              title="Export conversation"
            >
              <Download className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 && !isLoading && (
              <div className="text-center mt-24">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-xl">
                  <Bot className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to FinChatBot</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Your intelligent financial assistant. Upload documents or ask questions to get started.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3 mx-auto">
                      <span className="text-2xl">📄</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Upload Documents</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, Excel, CSV files</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3 mx-auto">
                      <span className="text-2xl">💬</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Ask Questions</p>
                    <p className="text-xs text-gray-500 mt-1">Get instant answers</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3 mx-auto">
                      <span className="text-2xl">📊</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Analyze Data</p>
                    <p className="text-xs text-gray-500 mt-1">Financial insights</p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <Message key={msg._id} message={msg} />
            ))}

            {isLoading && messages.length > 0 && (
              <div className="flex gap-4 mb-6 animate-fadeIn">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="px-6 py-4 bg-white rounded-3xl rounded-tl-md shadow-md border border-gray-100">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce-dot"></span>
                    <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce-dot"></span>
                    <span className="w-2.5 h-2.5 bg-blue-700 rounded-full animate-bounce-dot"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input */}
        <footer className="p-6 md:p-8 border-t border-gray-200/50 bg-white/80 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto">
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={handleSend}
              isLoading={isLoading}
              onFileUpload={handleFileUpload}
            />
          </div>
        </footer>
      </div>

      {/* Document Preview Panel */}
      <DocumentPreview
        conversationId={currentConversationId}
        isOpen={isDocumentPreviewOpen}
        onClose={() => setIsDocumentPreviewOpen(false)}
      />
    </div>
  );
};

export default ChatPage;
