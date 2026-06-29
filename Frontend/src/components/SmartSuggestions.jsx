/**
 * Smart Suggestions
 * Suggested follow-up questions, rendered as MUI chips/buttons.
 */

import { Box, Stack, Typography, ButtonBase } from '@mui/material';
import { LightbulbOutlined, ArrowForward } from '@mui/icons-material';
import { motion } from 'framer-motion';

const SmartSuggestions = ({ lastMessage, documents, onSuggestionClick, disabled }) => {
  const generateSuggestions = () => {
    if (!documents || documents.length === 0) {
      return [
        'Upload a financial document to get started',
        'What can you help me with?',
        'Explain financial terms',
      ];
    }

    if (lastMessage) {
      const content = lastMessage.content.toLowerCase();
      if (content.includes('revenue') || content.includes('sales')) {
        return ['What were the expenses?', 'Calculate the profit margin', 'Compare with previous quarter'];
      }
      if (content.includes('profit') || content.includes('income')) {
        return ["What's the year-over-year growth?", 'Show me the expense breakdown', 'What are the key drivers?'];
      }
      if (content.includes('expense') || content.includes('cost')) {
        return ['Which category has the highest cost?', 'How can we reduce expenses?', 'Compare with budget'];
      }
      if (content.includes('growth') || content.includes('increase')) {
        return ["What's driving this growth?", 'Is this sustainable?', 'Show me the trend analysis'];
      }
      return ['Summarize the key financial metrics', 'What are the main highlights?', 'Show me the revenue trends'];
    }

    return ['Summarize this document', 'What are the key financial metrics?', 'Show me revenue and profit trends'];
  };

  const suggestions = generateSuggestions();
  if (suggestions.length === 0 || disabled) return null;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        my: 2,
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.05)'),
      }}
    >
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
        <LightbulbOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography variant="subtitle2" color="primary.main">
          Suggested Questions
        </Typography>
      </Stack>
      <Stack spacing={1}>
        {suggestions.map((suggestion, index) => (
          <ButtonBase
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            disabled={disabled}
            sx={{
              width: '100%',
              justifyContent: 'space-between',
              px: 2,
              py: 1.25,
              borderRadius: 2,
              textAlign: 'left',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1, pr: 1 }}>
              {suggestion}
            </Typography>
            <ArrowForward sx={{ fontSize: 16, color: 'text.secondary' }} />
          </ButtonBase>
        ))}
      </Stack>
    </Box>
  );
};

export default SmartSuggestions;
