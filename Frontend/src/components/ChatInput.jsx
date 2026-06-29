/**
 * ChatInput.jsx
 *
 * A polished, production-ready chat input component.
 *
 * FIX SUMMARY (drag & drop):
 * The previous version tracked `dragOver` with a plain boolean toggled by
 * onDragEnter/onDragLeave on the outer container. Because that container has
 * nested children (the form, textarea, buttons, file-preview area), the
 * browser fires dragenter/dragleave on EVERY child as the cursor moves over
 * them. Each dragleave from a child box flipped dragOver back to false
 * immediately, even while still dragging over the parent — so the overlay
 * flickered and the drop frequently "missed" because the UI no longer
 * thought a drag was in progress when the drop event landed.
 *
 * Fix: use a drag-depth counter (ref) instead of a boolean, only flip the
 * visible state to false when the counter returns to 0, and handle the
 * counter on a single top-level wrapper rather than relying on bubbling from
 * arbitrary descendants. Also explicitly preventDefault on dragOver (required
 * by the spec for drop to fire at all) and validate dropped files exactly
 * like selected files.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Stack,
  IconButton,
  Chip,
  Typography,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Send,
  AttachFile,
  Close,
  Mic,
  MicOff,
  UploadFile,
  InsertDriveFileOutlined,
} from '@mui/icons-material';

// ─── Helpers ──────────────────────────────────────────────────────────────

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── VoiceButton Sub-component ───────────────────────────────────────────

const VoiceButton = ({ onTranscript, disabled, isRecording, onRecordingChange }) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const isActive = isRecording !== undefined ? isRecording : recording;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Make sure the mic is released if the component unmounts mid-recording.
  useEffect(() => stopStream, [stopStream]);

  const simulateTranscription = async () =>
    new Promise((resolve) => {
      setTimeout(() => resolve('Simulated voice transcription. Replace with real STT API.'), 1000);
    });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const transcript = await simulateTranscription(blob);
        onTranscript?.(transcript);
        stopStream();
      };

      mediaRecorder.start();
      setRecording(true);
      onRecordingChange?.(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, [onTranscript, onRecordingChange, stopStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    onRecordingChange?.(false);
  }, [onRecordingChange]);

  const toggleRecording = () => (isActive ? stopRecording() : startRecording());

  return (
    <Tooltip title={isActive ? 'Stop recording' : 'Voice input'}>
      <IconButton
        size="small"
        onClick={toggleRecording}
        disabled={disabled}
        sx={{
          color: isActive ? 'error.main' : 'text.secondary',
          bgcolor: isActive ? alpha('#f44336', 0.1) : 'transparent',
          animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.1)' },
          },
          '&:hover': {
            bgcolor: isActive ? alpha('#f44336', 0.2) : 'action.hover',
          },
        }}
      >
        {isActive ? <MicOff fontSize="small" /> : <Mic fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};

// ─── FileChip Sub-component ──────────────────────────────────────────────

const FileChip = ({ file, index, onRemove }) => (
  <Chip
    label={file.name}
    size="small"
    onDelete={() => onRemove(index)}
    deleteIcon={<Close sx={{ fontSize: 14 }} />}
    icon={<InsertDriveFileOutlined sx={{ fontSize: 14 }} />}
    sx={{
      maxWidth: 220,
      height: 30,
      borderRadius: 1.5,
      bgcolor: alpha('#1976d2', 0.08),
      border: '1px solid',
      borderColor: alpha('#1976d2', 0.2),
      color: 'primary.dark',
      fontWeight: 500,
      fontSize: '0.8125rem',
      '& .MuiChip-label': { px: 1 },
      '& .MuiChip-deleteIcon': {
        color: 'primary.main',
        '&:hover': { color: 'error.main' },
      },
      '& .MuiChip-icon': { color: 'primary.main', ml: '6px' },
    }}
  />
);

// ─── Main ChatInput Component ─────────────────────────────────────────────

const ChatInput = ({
  input,
  setInput,
  onSend,
  isLoading = false,
  onFileUpload,
  onVoiceTranscript,
  placeholder = 'Ask a financial question or describe your document…',
  modeColor = '#2563EB',
  acceptedFileTypes = '.pdf,.xlsx,.xls,.csv,.doc,.docx,.txt,.png,.jpg,.jpeg',
  maxFileSize = 10 * 1024 * 1024,
  maxFiles = 5,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  // Drag-depth counter. Using a ref (not state) avoids stale closures inside
  // the drag handlers and lets us ignore the bubbling enter/leave pairs that
  // fire for every nested element under the cursor.
  const dragDepthRef = useRef(0);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [input]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const submit = () => {
    if (input.trim() && !isLoading) {
      onSend();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const validateFiles = (incoming) => {
    const validFiles = [];
    const errors = [];

    if (selectedFiles.length + incoming.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return { validFiles, errors };
    }

    incoming.forEach((file) => {
      if (file.size > maxFileSize) {
        errors.push(`${file.name} exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)}MB limit`);
      } else {
        validFiles.push(file);
      }
    });

    return { validFiles, errors };
  };

  const addFiles = (incoming) => {
    if (incoming.length === 0) return;
    const { validFiles, errors } = validateFiles(incoming);
    if (errors.length > 0) setError(errors[0]);
    if (validFiles.length > 0) setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleFileSelect = (e) => {
    addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleFileUploadClick = () => {
    if (selectedFiles.length > 0 && onFileUpload) {
      onFileUpload(selectedFiles);
      setSelectedFiles([]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Drag & drop handlers (depth-counter based — see header note) ──────

  const dragHasFiles = (e) =>
    e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragHasFiles(e)) return;
    dragDepthRef.current += 1;
    if (dragDepthRef.current === 1) setDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Required so the browser allows a drop; also keeps the "copy" cursor.
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragOver(false);
    if (isLoading) return;
    const files = Array.from(e.dataTransfer?.files || []);
    addFiles(files);
  };

  const handleVoiceTranscript = (transcript) => {
    setInput((prev) => {
      const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
      return prev + separator + transcript;
    });
    onVoiceTranscript?.(transcript);
  };

  const canSend = input.trim().length > 0 && !isLoading;
  const totalFileSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      {/* Error Toast */}
      {error && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: alpha('#f44336', 0.08),
            border: '1px solid',
            borderColor: alpha('#f44336', 0.2),
          }}
        >
          <Close sx={{ fontSize: 16, color: 'error.main' }} />
          <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>
            {error}
          </Typography>
        </Box>
      )}

      {/* File Preview Area */}
      {selectedFiles.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            p: 2,
            borderRadius: 3,
            bgcolor: alpha('#1976d2', 0.03),
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {selectedFiles.map((file, index) => (
              <FileChip key={`${file.name}-${index}`} file={file} index={index} onRemove={removeFile} />
            ))}
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} · {formatBytes(totalFileSize)} total
            </Typography>

            <Box
              component="button"
              type="button"
              onClick={handleFileUploadClick}
              disabled={isLoading}
              sx={{
                border: 'none',
                borderRadius: 2,
                px: 2.5,
                py: 0.75,
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#fff',
                bgcolor: 'primary.main',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)',
                '&:hover': {
                  bgcolor: 'primary.dark',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.35)',
                },
                '&:active': { transform: 'translateY(0)' },
                '&:disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'text.disabled',
                  cursor: 'not-allowed',
                  boxShadow: 'none',
                  transform: 'none',
                },
              }}
            >
              Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
            </Box>
          </Stack>
        </Box>
      )}

      {/* Main Input Area — single drag/drop boundary lives on this wrapper */}
      <Box
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          position: 'relative',
          borderRadius: 3,
          border: '2px dashed',
          borderColor: dragOver ? modeColor : isFocused ? modeColor : 'transparent',
          outline: dragOver || isFocused ? 'none' : '2px solid',
          outlineColor: 'divider',
          outlineOffset: '-2px',
          bgcolor: dragOver ? alpha(modeColor, 0.08) : 'background.paper',
          transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
          boxShadow: isFocused
            ? `0 0 0 4px ${alpha(modeColor, 0.16)}`
            : dragOver
            ? `0 0 0 4px ${alpha(modeColor, 0.12)}`
            : '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Drag Overlay — purely visual, never intercepts pointer/drag events */}
        {dragOver && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              borderRadius: 3,
              bgcolor: alpha('#1976d2', 0.06),
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <UploadFile sx={{ fontSize: 28, color: 'primary.main' }} />
            <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              Drop files to attach
            </Typography>
          </Box>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            minHeight: 48,
            position: 'relative',
          }}
        >
          {onVoiceTranscript && (
            <VoiceButton
              onTranscript={handleVoiceTranscript}
              disabled={isLoading}
              isRecording={isRecording}
              onRecordingChange={setIsRecording}
            />
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFileTypes}
            onChange={handleFileSelect}
            hidden
            disabled={isLoading}
          />

          <Tooltip title="Attach files">
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              sx={{
                color: 'text.secondary',
                flexShrink: 0,
                '&:hover': { color: 'primary.main', bgcolor: alpha('#1976d2', 0.08) },
              }}
            >
              <AttachFile fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box
            component="textarea"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isRecording ? 'Listening…' : placeholder}
            disabled={isLoading}
            rows={1}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              fontSize: '0.9375rem',
              lineHeight: '24px',
              color: 'inherit',
              resize: 'none',
              overflow: 'hidden',
              padding: 0,
              margin: 0,
              minHeight: '24px',
              maxHeight: '160px',
            }}
            sx={{
              '&::placeholder': {
                color: isRecording ? modeColor : 'text.disabled',
                opacity: isRecording ? 1 : 0.7,
                fontStyle: isRecording ? 'italic' : 'normal',
              },
              '&:disabled': {
                color: 'text.disabled',
                cursor: 'not-allowed',
              },
            }}
          />

          <Tooltip title={canSend ? 'Send message' : 'Type a message to send'}>
            <span>
              <IconButton
                type="submit"
                disabled={!canSend}
                sx={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  bgcolor: canSend ? modeColor : 'transparent',
                  color: canSend ? '#fff' : 'text.disabled',
                  transition: 'all 0.2s ease',
                  boxShadow: canSend ? `0 2px 8px ${alpha(modeColor, 0.3)}` : 'none',
                  '&:hover': {
                    bgcolor: canSend ? alpha(modeColor, 0.95) : 'transparent',
                    transform: canSend ? 'scale(1.05)' : 'none',
                    boxShadow: canSend ? `0 4px 12px ${alpha(modeColor, 0.4)}` : 'none',
                  },
                  '&:active': { transform: canSend ? 'scale(0.95)' : 'none' },
                }}
              >
                <Send
                  fontSize="small"
                  sx={{
                    transform: canSend ? 'rotate(0deg)' : 'rotate(-45deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Keyboard Shortcuts Hint */}
      <Typography
        variant="caption"
        color="text.secondary"
        align="center"
        sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.75rem', letterSpacing: '0.025em' }}
      >
        Press{' '}
        <Box
          component="kbd"
          sx={{
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
            bgcolor: 'action.hover',
            fontFamily: 'monospace',
            fontSize: '0.6875rem',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          Enter
        </Box>{' '}
        to send
        <Box component="span" sx={{ mx: 1, color: 'text.disabled' }}>·</Box>
        <Box
          component="kbd"
          sx={{
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
            bgcolor: 'action.hover',
            fontFamily: 'monospace',
            fontSize: '0.6875rem',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          Shift + Enter
        </Box>{' '}
        for new line
        <Box component="span" sx={{ mx: 1, color: 'text.disabled' }}>·</Box>
        Drag & drop files
      </Typography>
    </Stack>
  );
};

export default ChatInput;