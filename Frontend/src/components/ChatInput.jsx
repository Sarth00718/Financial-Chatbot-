/**
 * Chat Input Component
 * Handles text input, file selection, voice input, and file upload.
 * Fully themed via CSS custom properties.
 */

import { useState } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { VoiceButton } from './VoiceInput';

const ChatInput = ({ input, setInput, onSend, isLoading, onFileUpload, onVoiceTranscript }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleFileUploadClick = () => {
    if (selectedFiles.length > 0) {
      onFileUpload(selectedFiles);
      setSelectedFiles([]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {/* ---- Selected Files Preview ---- */}
      {selectedFiles.length > 0 && (
        <div
          className="flex flex-wrap gap-2 p-2.5 rounded-xl border"
          style={{
            backgroundColor: 'var(--color-info-bg)',
            borderColor: 'rgba(59,130,246,0.3)',
          }}
        >
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shadow-sm border"
              style={{
                backgroundColor: 'var(--color-bg-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span className="truncate max-w-[120px]">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="flex-shrink-0 hover:text-red-500 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={handleFileUploadClick}
            disabled={isLoading}
            className="btn-primary py-1 px-3 text-xs"
          >
            Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* ---- Input Row ---- */}
      <form onSubmit={handleSubmit}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-150"
          style={{
            backgroundColor: 'var(--color-bg-input)',
            borderColor: 'var(--color-border-input)',
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-focus)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
          }}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              e.currentTarget.style.borderColor = 'var(--color-border-input)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {/* Voice Input */}
          {onVoiceTranscript && (
            <div className="flex-shrink-0">
              <VoiceButton onTranscript={onVoiceTranscript} disabled={isLoading} />
            </div>
          )}

          {/* File Attach */}
          <label className="flex-shrink-0 cursor-pointer">
            <input
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                isLoading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              }`}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Paperclip className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </label>

          {/* Text Area */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a financial question or describe your document…"
            disabled={isLoading}
            className="flex-1 bg-transparent focus:outline-none disabled:opacity-50 text-sm sm:text-base"
            style={{
              color: 'var(--color-text-primary)',
            }}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 p-2 sm:p-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isLoading || !input.trim() ? 'var(--color-bg-elevated)' : '#2563eb',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                isLoading || !input.trim() ? 'var(--color-bg-elevated)' : '#2563eb';
            }}
          >
            <Send
              className="w-4 h-4 sm:w-5 sm:h-5"
              style={{ color: isLoading || !input.trim() ? 'var(--color-text-muted)' : '#fff' }}
            />
          </button>
        </div>
      </form>

      {/* Helper text */}
      <p className="text-xs text-center hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
        Press <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>Enter</kbd> to send &nbsp;·&nbsp; <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>Shift+Enter</kbd> for new line
      </p>
    </div>
  );
};

export default ChatInput;
