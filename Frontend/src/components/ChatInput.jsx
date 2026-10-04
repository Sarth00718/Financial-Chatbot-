import { useRef, useEffect, useState } from 'react';
import {
  Box, IconButton, Tooltip, Paper, Typography, alpha, LinearProgress,
} from '@mui/material';
import {
  Send, AttachFile, Square,
} from '@mui/icons-material';
import { VoiceButton } from './VoiceInput';
import FeatureSelector from './FeatureSelector';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_FILE_SIZE_MB = 20;

const ChatInput = ({
  input, setInput, onSend, isLoading, onFileUpload, onVoiceTranscript,
  placeholder, modeColor, selectedFeature, onFeatureChange
}) => {
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!isLoading && inputRef.current) inputRef.current.focus();
  }, [isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    const validFiles = selectedFiles.filter((f) => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
    if (validFiles.length !== selectedFiles.length) {
      toast.error(`Some files exceed ${MAX_FILE_SIZE_MB}MB limit`);
    }
    setFiles(validFiles);
    onFileUpload(validFiles);
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []).filter(
      (f) => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024
    );
    if (dropped.length > 0) { setFiles(dropped); onFileUpload(dropped); }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              position: 'absolute', inset: -8, zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 3, border: '2px dashed', borderColor: 'primary.main',
              bgcolor: alpha('#2563EB', 0.05),
              backdropFilter: 'blur(4px)',
            }}
          >
            <Typography variant="body2" fontWeight={600} color="primary.main">
              Drop files to upload
            </Typography>
          </Box>
        )}
      </AnimatePresence>

      <Paper
        elevation={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          display: 'flex', alignItems: 'flex-end', gap: 1,
          px: 1.5, py: 1.25, borderRadius: 4,
          border: '1px solid',
          borderColor: isDragOver ? 'primary.main' : 'divider',
          background: 'var(--color-bg-elevated)', // Use theme elevated color for glassmorphism
          backdropFilter: 'blur(16px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:focus-within': {
            borderColor: modeColor || 'primary.main',
            boxShadow: `0 8px 32px ${alpha(modeColor || '#2563EB', 0.15)}, inset 0 1px 0 rgba(255,255,255,0.05)`,
            transform: 'translateY(-1px)',
          },
        }}
      >
        {/* Feature Selector integrated into the input */}
        <Box sx={{ mb: 0.25, mr: 0.5 }}>
          <FeatureSelector 
            selectedFeature={selectedFeature} 
            onFeatureChange={onFeatureChange} 
            disabled={isLoading} 
          />
        </Box>

        {/* File attach */}
        <Tooltip title="(PDF, Excel, CSV)">
          <span>
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              sx={{ mb: 0.25 }}
            >
              <AttachFile sx={{ fontSize: 20 }} />
            </IconButton>
          </span>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.csv,.xlsx,.xls,.txt,.md"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Textarea */}
        <Box
          component="textarea"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Type a message...'}
          disabled={isLoading}
          rows={1}
          sx={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            fontSize: '0.9375rem', lineHeight: 1.5, fontFamily: 'Inter, sans-serif',
            bgcolor: 'transparent', color: 'text.primary',
            minHeight: 24, maxHeight: 160,
            '&::placeholder': { color: 'text.secondary', opacity: 0.8 },
            '&:disabled': { opacity: 0.6 },
          }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />

        {/* Voice input */}
        <VoiceButton onTranscript={onVoiceTranscript} disabled={isLoading} />

        {/* Send / Stop */}
        <Tooltip title={isLoading ? 'Stop' : 'Send message'}>
          <span>
            <IconButton
              size="small"
              onClick={isLoading ? () => {} : onSend}
              disabled={!input.trim() && !isLoading}
              sx={{
                width: 32, height: 32,
                bgcolor: input.trim() && !isLoading ? (modeColor || 'primary.main') : 'action.disabledBackground',
                color: '#fff',
                '&:hover': {
                  bgcolor: input.trim() && !isLoading ? (modeColor || 'primary.dark') : 'action.disabledBackground',
                },
                '&:disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' },
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading ? <Square sx={{ fontSize: 14 }} /> : <Send sx={{ fontSize: 16 }} />}
            </IconButton>
          </span>
        </Tooltip>
      </Paper>
    </Box>
  );
};

export default ChatInput;
