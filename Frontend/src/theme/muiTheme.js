/**
 * MUI Theme — FinChatBot Enterprise v3.0
 * Glassmorphism-inspired SaaS dashboard theme with dark/light modes
 */

import { createTheme, alpha } from '@mui/material/styles';

export const createAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#60a5fa' : '#2563eb',
        light: isDark ? '#93c5fd' : '#3b82f6',
        dark: isDark ? '#3b82f6' : '#1d4ed8',
      },
      secondary: {
        main: isDark ? '#a78bfa' : '#7c3aed',
      },
      background: {
        default: isDark ? '#0f172a' : '#f1f5f9',
        paper: isDark ? alpha('#1e293b', 0.85) : alpha('#ffffff', 0.85),
      },
      text: {
        primary: isDark ? '#f1f5f9' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
      success: { main: '#10b981' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
      divider: isDark ? alpha('#334155', 0.6) : alpha('#e2e8f0', 0.8),
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark ? '#334155 #0f172a' : '#cbd5e1 #f1f5f9',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${isDark ? alpha('#334155', 0.5) : alpha('#e2e8f0', 0.8)}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          contained: {
            background: isDark
              ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
              : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(16px)',
            background: isDark
              ? alpha('#1e293b', 0.7)
              : alpha('#ffffff', 0.75),
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backdropFilter: 'blur(20px)',
            background: isDark
              ? alpha('#0f172a', 0.92)
              : alpha('#ffffff', 0.92),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },
    },
  });
};

export const glassStyles = (isDark) => ({
  glass: {
    backdropFilter: 'blur(16px)',
    background: isDark ? alpha('#1e293b', 0.75) : alpha('#ffffff', 0.75),
    border: `1px solid ${isDark ? alpha('#334155', 0.5) : alpha('#e2e8f0', 0.8)}`,
    borderRadius: 3,
  },
});
