/**
 * Message Component
 * Renders individual chat messages for user, assistant, and system roles.
 * Supports Markdown for assistant responses, voice speaker, data visualization,
 * and edit/delete functionality for user messages.
 */

import { useState } from 'react';
import { User, BarChart3, Info, Edit2, Trash2, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SpeakerButton } from './VoiceInput';
import DataVisualization from './DataVisualization';
import { messageAPI } from '../utils/api';
import toast from 'react-hot-toast';

const Message = ({ message, onMessageUpdate, onMessageDelete, onRegenerateResponse }) => {
  const { role, content, createdAt } = message;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const isUser      = role === 'user';
  const isAssistant = role === 'assistant';
  const isSystem    = role === 'system';

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === content) {
      setIsEditing(false);
      setEditContent(content);
      return;
    }

    try {
      await messageAPI.update(message._id, editContent.trim());
      onMessageUpdate(message._id, editContent.trim());
      setIsEditing(false);
      toast.success('Message updated');
    } catch (error) {
      console.error('Failed to update message:', error);
      toast.error('Failed to update message');
      setEditContent(content);
    }
  };

  const handleEditAndRegenerate = async () => {
    if (!editContent.trim() || editContent === content) {
      setIsEditing(false);
      setEditContent(content);
      return;
    }

    try {
      setIsRegenerating(true);
      const response = await messageAPI.editAndRegenerate(message._id, editContent.trim());
      
      // Call parent to handle the regenerated response
      if (onRegenerateResponse) {
        onRegenerateResponse(response.data.data);
      }
      
      setIsEditing(false);
      toast.success('Response regenerated');
    } catch (error) {
      console.error('Failed to regenerate response:', error);
      toast.error('Failed to regenerate response');
      setEditContent(content);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this message?')) return;

    try {
      setIsDeleting(true);
      await messageAPI.delete(message._id);
      onMessageDelete(message._id);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(content);
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isDeleting) return null;

  return (
    <div
      className={`flex gap-2.5 sm:gap-3 mb-4 sm:mb-6 animate-fadeIn group ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* ---- LEFT AVATAR (assistant / system) ---- */}
      {!isUser && (
        <div className="flex-shrink-0 self-end">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shadow-md ${
              isAssistant
                ? 'bg-gradient-to-br from-blue-600 to-blue-700'
                : ''
            }`}
            style={
              isSystem
                ? {
                    backgroundColor: 'var(--color-info-bg)',
                    border: '1px solid rgba(59,130,246,0.25)',
                  }
                : {}
            }
          >
            {isAssistant ? (
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : (
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'var(--color-info-text)' }} />
            )}
          </div>
        </div>
      )}

      {/* ---- MESSAGE BODY ---- */}
      <div className={`flex-1 max-w-[82%] sm:max-w-[78%] lg:max-w-[68%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={
            isUser
              ? 'message-user'
              : isAssistant
              ? 'message-assistant'
              : 'message-system'
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                /* Edit mode */
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 text-sm rounded-lg border resize-none"
                    style={{
                      backgroundColor: 'var(--color-bg-input)',
                      borderColor: 'var(--color-border-input)',
                      color: 'var(--color-text-primary)',
                      minHeight: '80px',
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleEditAndRegenerate();
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleEditAndRegenerate}
                      disabled={isRegenerating}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      {isRegenerating ? 'Regenerating...' : 'Save & Regenerate'}
                    </button>
                    <button
                      onClick={handleEdit}
                      disabled={isRegenerating}
                      className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Save Only
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isRegenerating}
                      className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                    <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                      Ctrl+Enter to save & regenerate
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {isAssistant ? (
                    /* Markdown for assistant */
                    <div className="prose-chat">
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => (
                            <p {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong {...props} />
                          ),
                          code: ({ node, inline, ...props }) =>
                            inline ? (
                              <code {...props} />
                            ) : (
                              <pre><code {...props} /></pre>
                            ),
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    /* Plain text for user and system */
                    <p className={`leading-relaxed ${isSystem ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>
                      {content}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Action buttons */}
            {!isEditing && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {isAssistant && <SpeakerButton text={content} />}
                {isUser && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit message"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Timestamp */}
          {createdAt && !isEditing && (
            <p 
              className="text-xs mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {formatTime(createdAt)}
            </p>
          )}
        </div>

        {/* Data visualization below assistant messages */}
        {isAssistant && !isEditing && <DataVisualization content={content} />}
      </div>

      {/* ---- RIGHT AVATAR (user) ---- */}
      {isUser && (
        <div className="flex-shrink-0 self-end">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shadow-md"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--color-text-secondary)' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Message;
