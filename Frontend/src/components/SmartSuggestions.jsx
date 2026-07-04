import { useState, useEffect } from 'react';
import { Box, Typography, Chip, alpha } from '@mui/material';
import { AutoAwesome, TrendingUp, Description, QuestionAnswer } from '@mui/icons-material';
import { motion } from 'framer-motion';

const SmartSuggestions = ({ lastMessage, documents, onSuggestionClick, disabled }) => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!lastMessage?.content) return;
    const content = lastMessage.content.toLowerCase();
    const topics = [];
    if (content.includes('revenue') || content.includes('growth') || content.includes('margin'))
      topics.push({ text: 'Show revenue and margin trends', icon: TrendingUp, color: '#7C3AED' });
    if (content.includes('risk') || content.includes('liability') || content.includes('debt'))
      topics.push({ text: 'Detail the risk factors and liabilities', icon: Description, color: '#16A34A' });
    if (content.includes('ratio') || content.includes('kpi') || content.includes('performance'))
      topics.push({ text: 'Summarize key financial KPIs', icon: TrendingUp, color: '#7C3AED' });
    if (content.includes('compare') || content.includes('vs') || content.includes('versus'))
      topics.push({ text: 'Compare period-over-period changes', icon: QuestionAnswer, color: '#2563EB' });
    if (documents.length > 0 && !content.includes('document'))
      topics.push({ text: 'Reference information from uploaded documents', icon: Description, color: '#16A34A' });
    if (content.includes('outlook') || content.includes('guidance') || content.includes('future'))
      topics.push({ text: 'Analyze forward-looking statements', icon: AutoAwesome, color: '#2563EB' });
    if (topics.length === 0)
      topics.push(
        { text: 'Elaborate with more detail', icon: AutoAwesome, color: '#2563EB' },
        { text: 'Present this as a bullet summary', icon: Description, color: '#16A34A' },
      );
    setSuggestions(topics.slice(0, 3));
  }, [lastMessage, documents]);

  if (suggestions.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.5 }}>
      <Box sx={{ pl: 6, pr: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
          <AutoAwesome sx={{ fontSize: 13, color: 'primary.main' }} />
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: '0.7rem', letterSpacing: '0.03em' }}>
            FOLLOW-UP
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {suggestions.map((s, i) => (
            <Chip
              key={i}
              icon={<s.icon sx={{ fontSize: 14 }} />}
              label={s.text}
              onClick={() => !disabled && onSuggestionClick(s.text)}
              disabled={disabled}
              variant="outlined"
              sx={{
                borderRadius: 2, height: 30, fontSize: '0.75rem', fontWeight: 500,
                borderColor: alpha(s.color, 0.3),
                color: s.color,
                '&:hover': { borderColor: s.color, bgcolor: alpha(s.color, 0.04) },
                '& .MuiChip-icon': { color: s.color },
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </Box>
      </Box>
    </motion.div>
  );
};

export default SmartSuggestions;
