/**
 * Sidebar Component
 * Shows list of conversations and navigation
 */

import { useState } from 'react';
import { Plus, MessageSquare, Trash2, X, Edit2, Check, Search, FileText } from 'lucide-react';
import logo from '../assets/logo.png';

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
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleStartEdit = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv._id);
    setEditingTitle(conv.title);
  };

  const handleSaveEdit = async (convId, e) => {
    e.stopPropagation();
    if (editingTitle.trim() && editingTitle !== conversations.find(c => c._id === convId)?.title) {
      await onRenameChat(convId, editingTitle.trim());
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

  // Filter conversations based on search query
  const filteredConversations = searchQuery
    ? conversations.filter((conv) =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <>
      {/* Sidebar */}
      <div
        className={`
          fixed md:relative z-30 h-full w-full sm:w-80 md:w-80 lg:w-96 bg-white/95 backdrop-blur-xl border-r border-gray-200/50
          transform transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200/50 bg-gradient-to-br from-white to-blue-50/30">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <img src={logo} alt="FinChat AI Logo" className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-lg" />
                <h2 className="text-lg sm:text-xl font-bold gradient-text">
                  FinChatBot
                </h2>
              </div>
              <button
                onClick={onClose}
                className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* New Chat Button */}
            <button
              onClick={onNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg font-semibold transform hover:-translate-y-0.5 active:scale-95 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>New Conversation</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-4">
            {filteredConversations.length === 0 ? (
              <div className="text-center text-gray-400 mt-12">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 font-medium">No conversations yet</p>
                <p className="text-xs text-gray-400 mt-1">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv._id}
                    className={`
                      group flex items-center gap-3 p-4 rounded-xl cursor-pointer
                      transition-all duration-200
                      ${
                        currentConversationId === conv._id
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 border-2 border-blue-200 shadow-md'
                          : 'hover:bg-gray-50 text-gray-700 border-2 border-transparent hover:border-gray-200'
                      }
                    `}
                  >
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        currentConversationId === conv._id 
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <MessageSquare className={`w-5 h-5 ${
                          currentConversationId === conv._id ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      {conv.documents && conv.documents.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-xs font-bold text-white">{conv.documents.length}</span>
                        </div>
                      )}
                    </div>
                    <div
                      onClick={() => editingId !== conv._id && onSelectChat(conv._id)}
                      className="flex-1 min-w-0"
                    >
                      {editingId === conv._id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, conv._id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-sm font-semibold bg-white border-2 border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <p className="text-sm truncate font-semibold">{conv.title}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(conv.updatedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {editingId === conv._id ? (
                        <>
                          <button
                            onClick={(e) => handleSaveEdit(conv._id, e)}
                            className="p-2 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title="Save"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
                            title="Cancel"
                          >
                            <X className="w-4 h-4 text-gray-600" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => handleStartEdit(conv, e)}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Rename conversation"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(conv._id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 md:p-6 border-t border-gray-200/50 bg-gradient-to-br from-gray-50 to-white">
            <div className="text-center">
              <p className="text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                FinChatBot v2.0
              </p>
              <p className="text-xs text-gray-500 mt-1">Financial AI Assistant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;
