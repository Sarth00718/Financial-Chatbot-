/**
 * Sidebar Component
 * Conversation list with search — full light/dark mode support.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, MessageSquare, Trash2, X, Search, Bot, Edit2, Check } from 'lucide-react';
import { conversationAPI } from '../utils/api';
import ThemeToggle from './ThemeToggle';
import toast from 'react-hot-toast';

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
  const [searchError, setSearchError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Debounced search function
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError('');
        const response = await conversationAPI.search(searchQuery);
        setSearchResults(response.data.data.conversations);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchError('Search failed. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Determine which conversations to display
  const displayedConversations = searchQuery.trim() 
    ? searchResults 
    : conversations;

  const handleStartEdit = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv._id);
    setEditTitle(conv.title);
  };

  const handleSaveEdit = async (convId, e) => {
    e?.stopPropagation();
    if (!editTitle.trim() || editTitle === conversations.find(c => c._id === convId)?.title) {
      setEditingId(null);
      return;
    }

    try {
      await conversationAPI.update(convId, { title: editTitle.trim() });
      if (onRenameChat) {
        onRenameChat(convId, editTitle.trim());
      }
      setEditingId(null);
      toast.success('Chat renamed');
    } catch (error) {
      console.error('Failed to rename chat:', error);
      toast.error('Failed to rename chat');
    }
  };

  const handleCancelEdit = (e) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  return (
    <>
      {/* ---- Sidebar Panel ---- */}
      <div
        className={`
          fixed md:relative z-30 h-full w-72 sm:w-80 flex flex-col
          sidebar-bg
          transform transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ minHeight: '100vh' }}
      >
        {/* ---- Header ---- */}
        <div className="p-4 sm:p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {/* Brand Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold gradient-text">FinChatBot</h2>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Financial AI</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Theme toggle lives here on all screen sizes */}
              <ThemeToggle />
              {/* Close button — mobile only */}
              <button
                onClick={onClose}
                className="md:hidden icon-btn"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="btn-primary w-full gap-2 py-2.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* ---- Search ---- */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border transition-all"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                borderColor: 'var(--color-border-input)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-border-focus)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
                e.target.style.outline = 'none';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border-input)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn p-1"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {isSearching && (
            <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
              Searching...
            </p>
          )}
          {searchError && (
            <p className="text-xs mt-2 text-center text-red-500">
              {searchError}
            </p>
          )}
        </div>

        {/* ---- Conversation List ---- */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {displayedConversations.length === 0 ? (
            <div className="text-center mt-12 px-4">
              <div
                className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-bg-elevated)' }}
              >
                {searchQuery ? (
                  <Search className="w-8 h-8" style={{ color: 'var(--color-text-muted)' }} />
                ) : (
                  <MessageSquare className="w-8 h-8" style={{ color: 'var(--color-text-muted)' }} />
                )}
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {searchQuery ? 'No results found' : 'No conversations yet'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {searchQuery ? 'Try a different term' : 'Start a new chat above'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayedConversations.map((conv) => {
                const isActive = currentConversationId === conv._id;
                return (
                  <div
                    key={conv._id}
                    className={`group flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all duration-150 border-2 ${
                      isActive
                        ? 'border-blue-500/40 shadow-sm'
                        : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActive ? 'bg-blue-600' : ''
                      }`}
                      style={!isActive ? { backgroundColor: 'var(--color-bg-elevated)' } : {}}
                    >
                      <MessageSquare
                        className={`w-4 h-4 ${isActive ? 'text-white' : ''}`}
                        style={!isActive ? { color: 'var(--color-text-muted)' } : {}}
                      />
                    </div>

                    {/* Info */}
                    <div
                      onClick={() => editingId !== conv._id && onSelectChat(conv._id)}
                      className="flex-1 min-w-0"
                    >
                      {editingId === conv._id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(conv._id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          className="w-full px-2 py-1 text-sm rounded border"
                          style={{
                            backgroundColor: 'var(--color-bg-input)',
                            borderColor: 'var(--color-border-focus)',
                            color: 'var(--color-text-primary)',
                          }}
                          autoFocus
                        />
                      ) : (
                        <>
                          <p
                            className="text-sm font-semibold truncate"
                            style={{ color: isActive ? 'var(--color-primary-text)' : 'var(--color-text-primary)' }}
                          >
                            {conv.title}
                          </p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(conv.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === conv._id ? (
                        <>
                          <button
                            onClick={(e) => handleSaveEdit(conv._id, e)}
                            className="icon-btn p-1.5 text-green-600 hover:bg-green-50"
                            title="Save"
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.12)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="icon-btn p-1.5"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => handleStartEdit(conv, e)}
                            className="icon-btn p-1.5"
                            title="Rename conversation"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(conv._id);
                            }}
                            className="icon-btn p-1.5 text-red-500 hover:bg-red-50"
                            title="Delete conversation"
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- Footer ---- */}
        <div className="p-4 border-t text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-elevated)' }}>
          <p className="text-xs font-bold gradient-text">FinChatBot v2.0</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Powered by Groq AI</p>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;
