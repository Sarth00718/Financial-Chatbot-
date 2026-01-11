/**
 * Message Component
 * Displays a single chat message
 */

import { useState } from 'react';
import { User, Bot, Info, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const Message = ({ message }) => {
  const { role, content, createdAt } = message;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Different styles for different message types
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  const isSystem = role === 'system';

  return (
    <div className={`flex gap-4 mb-8 animate-fadeIn ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar (left side for assistant/system) */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
              isAssistant 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                : 'bg-gradient-to-br from-blue-100 to-blue-200'
            }`}
          >
            {isAssistant ? (
              <Bot className="w-6 h-6 text-white" />
            ) : (
              <Info className="w-5 h-5 text-blue-600" />
            )}
          </div>
        </div>
      )}

      {/* Message Content */}
      <div
        className={`max-w-[75%] md:max-w-[65%] ${
          isUser
            ? 'message-user px-6 py-4'
            : isAssistant
            ? 'message-assistant px-6 py-4'
            : 'message-system px-5 py-3'
        }`}
      >
        {isAssistant ? (
          // Render markdown for assistant messages
          <div className="prose prose-gray prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                ul: ({node, ...props}) => <ul className="mb-3 ml-4 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="mb-3 ml-4 space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                code: ({node, inline, ...props}) => 
                  inline ? (
                    <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono" {...props} />
                  ) : (
                    <code className="block p-3 bg-gray-50 rounded-lg text-sm font-mono overflow-x-auto" {...props} />
                  ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          // Plain text for user and system messages
          <p className={`leading-relaxed ${isSystem ? 'text-sm' : 'text-base'}`}>{content}</p>
        )}
      </div>

      {/* Avatar (right side for user) */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-lg">
            <User className="w-6 h-6 text-gray-700" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Message;
