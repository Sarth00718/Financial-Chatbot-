import { useState } from 'react';
import {
  Box, ToggleButton, ToggleButtonGroup, Tooltip, Typography, Paper, alpha,
  ClickAwayListener,
} from '@mui/material';
import {
  QuestionAnswer, Description, TrendingUp, Forum,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const features = [
  { key: 'Smart_Chat', label: 'Smart Chat', icon: QuestionAnswer, color: '#2563EB', desc: 'Context-aware Q&A' },
  { key: 'Document_Analysis', label: 'Doc Analysis', icon: Description, color: '#16A34A', desc: 'Extract & cite data' },
  { key: 'Analytical_Insights', label: 'Insights', icon: TrendingUp, color: '#7C3AED', desc: 'Charts & KPIs' },
  { key: 'General_Conversation', label: 'General', icon: Forum, color: '#64748B', desc: 'Finance discussion' },
];

const FeatureSelector = ({ selectedFeature, onFeatureChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const current = features.find((f) => f.key === selectedFeature) || features[0];
  const Icon = current.icon;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative' }}>
        <Tooltip title="Change AI mode">
          <Box
            onClick={() => !disabled && setOpen(!open)}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              px: 1.25, py: 0.5, borderRadius: 2, cursor: disabled ? 'default' : 'pointer',
              bgcolor: open ? alpha(current.color, 0.08) : 'transparent',
              transition: 'all 0.15s ease',
              '&:hover': disabled ? {} : { bgcolor: alpha(current.color, 0.08) },
              userSelect: 'none',
            }}
          >
            <Icon sx={{ fontSize: 16, color: current.color }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: current.color, fontSize: '0.75rem' }}>
              {current.label}
            </Typography>
          </Box>
        </Tooltip>

        <AnimatePresence>
          {open && (
            <Paper
              component={motion.div}
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              elevation={8}
              sx={{
                position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                mt: 0.5, p: 0.5, borderRadius: 2, minWidth: 200, zIndex: 1000,
                border: '1px solid', borderColor: 'divider',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              }}
            >
              {features.map((f) => {
                const isSelected = f.key === selectedFeature;
                const FIcon = f.icon;
                return (
                  <Box
                    key={f.key}
                    onClick={() => { onFeatureChange(f.key); setOpen(false); }}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      px: 1.5, py: 1, borderRadius: 1.5, cursor: 'pointer',
                      bgcolor: isSelected ? alpha(f.color, 0.1) : 'transparent',
                      transition: 'all 0.12s ease',
                      '&:hover': { bgcolor: alpha(f.color, 0.06) },
                    }}
                  >
                    <Box
                      sx={{
                        width: 30, height: 30, borderRadius: 1.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: alpha(f.color, 0.1),
                      }}
                    >
                      <FIcon sx={{ fontSize: 15, color: f.color }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8125rem' }}>
                        {f.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.675rem' }}>
                        {f.desc}
                      </Typography>
                    </Box>
                    {isSelected && (
                      <Box
                        sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          bgcolor: f.color, flexShrink: 0,
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Paper>
          )}
        </AnimatePresence>
      </Box>
    </ClickAwayListener>
  );
};

export default FeatureSelector;
