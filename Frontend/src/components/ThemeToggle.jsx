/**
 * Theme Toggle
 * Animated light/dark mode switch built on MUI IconButton.
 */

import { IconButton, Tooltip } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ size = 'medium' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
      <IconButton
        onClick={toggleTheme}
        size={size}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        aria-pressed={isDark}
        sx={{
          position: 'relative',
          color: isDark ? '#FBBF24' : '#4F46E5',
          bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
          transition: 'all 0.2s',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? 'dark' : 'light'}
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex' }}
          >
            {isDark ? <DarkMode fontSize="inherit" /> : <LightMode fontSize="inherit" />}
          </motion.span>
        </AnimatePresence>
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
