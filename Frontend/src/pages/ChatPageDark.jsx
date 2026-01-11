/**
 * Chat Page - Professional Dark Theme
 * Modern AI chat interface with authentication
 */

import { useState, useEffect, useRef } from 'react';
import { Menu, Download, Share2, Bot, LogOut, FileText, Sparkles, Upload, Send, Plus, Trash2, MessageSquare, User, Edit2, Check, X, BarChart3, Mic, MicOff } from 'lucide-react';
import { conversationAPI, documentAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DocumentPreview from '../components/DocumentPreview';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import logo from '../assets/logo.png';

const ChatPageDark = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [mode, setMode] = useState('smart');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages();
    }
  }, [currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }

        if (finalTranscript) {
          setInput((prev) => prev + finalTranscript);
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

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
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const fetchMessages = async () => {
    if (!currentConversationId) return;

    try {
      setIsLoading(true);
      const response = await conversationAPI.getById(currentConversationId);
      setMessages(response.data.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSelectChat = (id) => {
    setCurrentConversationId(id);
    setIsSidebarOpen(false);
  };

  const handleDeleteChat = async (id) => {
    if (!window.confirm('Delete this conversation?')) return;

    try {
      await conversationAPI.delete(id);
      const updated = conversations.filter((c) => c._id !== id);
      setConversations(updated);

      if (currentConversationId === id) {
        if (updated.length > 0) {
          setCurrentConversationId(updated[0]._id);
        } else {
          await handleNewChat();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

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

  const handleStartEdit = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv._id);
    setEditingTitle(conv.title);
  };

  const handleSaveEdit = async (convId, e) => {
    e.stopPropagation();
    if (editingTitle.trim() && editingTitle !== conversations.find(c => c._id === convId)?.title) {
      await handleRenameChat(convId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e, convId) => {
    if (e.key === 'Enter') {
      handleSaveEdit(convId, e);
    } else if (e.key === 'Escape') {
      handleCancelEdit(e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentConversationId || isLoading) return;

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
      await conversationAPI.sendMessage(currentConversationId, messageContent);
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

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
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
            ? { ...m, content: `${fileNames} uploaded successfully. Processing with OCR...` }
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleRecording = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 w-full sm:w-80 md:w-80 lg:w-96 h-full bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 sm:p-5 md:p-6 border-b border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src={logo} alt="FinChat AI" className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-lg" />
                <div>
                  <h2 className="font-bold text-base sm:text-lg">FinChat AI</h2>
                  <p className="text-xs text-slate-400">OCR + AI Powered</p>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={handleNewChat}
              className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              New Chat
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-thin">
            {conversations.map((conv) => (
              <div
                key={conv._id}
                onClick={() => editingId !== conv._id && handleSelectChat(conv._id)}
                className={`group p-3 rounded-xl cursor-pointer transition-all ${
                  currentConversationId === conv._id
                    ? 'bg-slate-800 border border-slate-700'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                      <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      {conv.documents && conv.documents.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white">{conv.documents.length}</span>
                        </div>
                      )}
                    </div>
                    {editingId === conv._id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, conv._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-sm bg-slate-700 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm truncate">{conv.title || 'New Chat'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {editingId === conv._id ? (
                      <>
                        <button
                          onClick={(e) => handleSaveEdit(conv._id, e)}
                          className="p-1 hover:bg-green-500/20 rounded-lg transition-all"
                          title="Save"
                        >
                          <Check className="w-4 h-4 text-green-400" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 hover:bg-slate-700 rounded-lg transition-all"
                          title="Cancel"
                        >
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleStartEdit(conv, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-500/20 rounded-lg transition-all"
                          title="Rename"
                        >
                          <Edit2 className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(conv._id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-slate-800">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </button>
              
              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-700 transition-all text-red-400"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-slate-800 rounded-xl transition-all flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-bold truncate">Financial Analysis</h1>
              <p className="text-xs text-slate-400 hidden sm:block">Smart Mode • OCR Enabled</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:p-2.5 hover:bg-slate-800 rounded-xl transition-all group"
              title="Upload documents"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-blue-400" />
            </button>
            <button
              onClick={() => setIsDocumentPreviewOpen(true)}
              className="p-2 sm:p-2.5 hover:bg-slate-800 rounded-xl transition-all group"
              title="View documents"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-blue-400" />
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="hidden sm:block p-2.5 hover:bg-slate-800 rounded-xl transition-all group"
              title="Analytics"
            >
              <BarChart3 className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
            </button>
            <button className="hidden md:block p-2.5 hover:bg-slate-800 rounded-xl transition-all group" title="Share">
              <Share2 className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
            </button>
            <button className="hidden md:block p-2.5 hover:bg-slate-800 rounded-xl transition-all group" title="Export">
              <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 scrollbar-thin">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 && !isLoading && (
              <div className="text-center mt-12 sm:mt-16 md:mt-24">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Ready to Analyze</h2>
                <p className="text-slate-400 mb-6 sm:mb-8 text-sm sm:text-base">Upload documents or ask questions</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
                  <div className="p-4 sm:p-6 bg-slate-900 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all">
                    <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mx-auto mb-2 sm:mb-3" />
                    <p className="font-semibold mb-1 text-sm sm:text-base">OCR Processing</p>
                    <p className="text-xs text-slate-400">Extract text from images</p>
                  </div>
                  <div className="p-4 sm:p-6 bg-slate-900 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition-all">
                    <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mx-auto mb-2 sm:mb-3" />
                    <p className="font-semibold mb-1 text-sm sm:text-base">AI Analysis</p>
                    <p className="text-xs text-slate-400">Groq + Gemini powered</p>
                  </div>
                  <div className="p-4 sm:p-6 bg-slate-900 rounded-2xl border border-slate-800 hover:border-green-500/50 transition-all sm:col-span-2 md:col-span-1">
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mx-auto mb-2 sm:mb-3" />
                    <p className="font-semibold mb-1 text-sm sm:text-base">Instant Insights</p>
                    <p className="text-xs text-slate-400">Real-time responses</p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg._id} className={`flex gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-2xl px-4 sm:px-5 md:px-6 py-3 sm:py-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-800'
                    : msg.role === 'system'
                    ? 'bg-slate-800 border border-slate-700'
                    : 'bg-slate-900 border border-slate-800'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed text-slate-200" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-3 text-white" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-2 text-white" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-2 text-white" {...props} />,
                          ul: ({node, ...props}) => <ul className="mb-3 ml-4 space-y-1 list-disc text-slate-200" {...props} />,
                          ol: ({node, ...props}) => <ol className="mb-3 ml-4 space-y-1 list-decimal text-slate-200" {...props} />,
                          li: ({node, ...props}) => <li className="leading-relaxed text-slate-200" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                          em: ({node, ...props}) => <em className="italic text-slate-300" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-300 my-3" {...props} />,
                          code: ({node, inline, className, children, ...props}) => {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-lg my-3"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="px-1.5 py-0.5 bg-slate-800 text-blue-300 rounded text-sm font-mono" {...props}>
                                {children}
                              </code>
                            );
                          },
                          a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                          table: ({node, ...props}) => <table className="border-collapse border border-slate-700 my-3" {...props} />,
                          th: ({node, ...props}) => <th className="border border-slate-700 px-3 py-2 bg-slate-800 text-white" {...props} />,
                          td: ({node, ...props}) => <td className="border border-slate-700 px-3 py-2 text-slate-200" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="px-6 py-4 bg-slate-900 rounded-2xl border border-slate-800">
                  <div className="flex gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-2 h-2 bg-blue-700 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input */}
        <footer className="p-3 sm:p-4 md:p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 sm:gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept=".pdf,.xlsx,.xls,.csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 sm:p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all flex-shrink-0"
                title="Upload files"
              >
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              </button>
              <button
                onClick={toggleRecording}
                className={`p-2 sm:p-3 rounded-xl transition-all flex-shrink-0 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                )}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about your documents..."
                className="flex-1 px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0 text-sm sm:text-base"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            {isRecording && (
              <p className="text-center text-xs sm:text-sm text-blue-400 mt-2 animate-pulse">
                🎤 Listening... Speak now
              </p>
            )}
          </div>
        </footer>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Document Preview Panel */}
      <DocumentPreview
        conversationId={currentConversationId}
        isOpen={isDocumentPreviewOpen}
        onClose={() => setIsDocumentPreviewOpen(false)}
      />
    </div>
  );
};

export default ChatPageDark;
