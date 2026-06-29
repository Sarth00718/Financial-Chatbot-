/**
 * MUI Theme — FinChatBot Enterprise
 * Unified design system: Linear / Stripe / Vercel-inspired enterprise SaaS theme.
 * Single source of truth for color, spacing, radius, and component defaults.
 */

import { createTheme } from '@mui/material/styles';
import { alpha } from '@mui/system';

export const tokens = {
  primary: '#2563EB',
  secondary: '#7C3AED',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  bgLight: '#F8FAFC',
  surfaceLight: '#FFFFFF',
  bgDark: '#0F172A',
  surfaceDark: '#1E293B',
};

export const createAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark';

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: tokens.primary,
        light: isDark ? '#60A5FA' : '#3B82F6',
        dark: '#1D4ED8',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: tokens.secondary,
        light: isDark ? '#A78BFA' : '#8B5CF6',
        dark: '#6D28D9',
        contrastText: '#FFFFFF',
      },
      success: { main: tokens.success, light: '#22C55E', dark: '#15803D' },
      warning: { main: tokens.warning, light: '#FBBF24', dark: '#B45309' },
      error: { main: tokens.danger, light: '#EF4444', dark: '#B91C1C' },
      info: { main: '#0EA5E9' },
      background: {
        default: isDark ? tokens.bgDark : tokens.bgLight,
        paper: isDark ? tokens.surfaceDark : tokens.surfaceLight,
      },
      text: {
        primary: isDark ? '#F1F5F9' : '#0F172A',
        secondary: isDark ? '#94A3B8' : '#64748B',
        disabled: isDark ? '#475569' : '#CBD5E1',
      },
      divider: isDark ? alpha('#334155', 0.6) : alpha('#E2E8F0', 0.9),
      action: {
        hover: isDark ? alpha('#FFFFFF', 0.06) : alpha('#0F172A', 0.04),
        selected: isDark ? alpha(tokens.primary, 0.18) : alpha(tokens.primary, 0.08),
      },
    },

    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.02em', fontSize: 'clamp(1.75rem, 1.4rem + 1vw, 2.5rem)' },
      h2: { fontWeight: 700, letterSpacing: '-0.02em', fontSize: 'clamp(1.5rem, 1.2rem + 1vw, 2rem)' },
      h3: { fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      body1: { fontSize: '0.9375rem' },
      body2: { fontSize: '0.875rem' },
      button: { textTransform: 'none', fontWeight: 600 },
      caption: { fontSize: '0.75rem' },
    },

    shape: { borderRadius: 16 },

    spacing: 8,

    breakpoints: {
      values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? '#334155 transparent' : '#CBD5E1 transparent',
            '&::-webkit-scrollbar': { width: 8, height: 8 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isDark ? '#334155' : '#CBD5E1',
              borderRadius: 8,
            },
            '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: isDark ? alpha('#334155', 0.7) : '#E2E8F0' },
        },
        defaultProps: { elevation: 0 },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            border: `1px solid ${isDark ? alpha('#334155', 0.7) : '#E2E8F0'}`,
            boxShadow: isDark
              ? '0 1px 2px rgba(0,0,0,0.3)'
              : '0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.03)',
            transition: 'box-shadow 150ms ease, transform 150ms ease',
          },
        },
      },
      MuiCardContent: { styleOverrides: { root: { padding: 20 } } },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? alpha(tokens.surfaceDark, 0.85) : alpha('#FFFFFF', 0.85),
            backdropFilter: 'blur(10px)',
            color: isDark ? '#F1F5F9' : '#0F172A',
            borderBottom: `1px solid ${isDark ? alpha('#334155', 0.6) : '#E2E8F0'}`,
          },
        },
        defaultProps: { elevation: 0 },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? tokens.bgDark : '#FFFFFF',
            borderRight: `1px solid ${isDark ? alpha('#334155', 0.6) : '#E2E8F0'}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            boxShadow: 'none',
            paddingInline: 16,
            height: 40,
            '&:hover': { boxShadow: 'none' },
          },
          sizeSmall: { height: 32, borderRadius: 8 },
          sizeLarge: { height: 48, borderRadius: 12 },
          containedPrimary: {
            '&:hover': { backgroundColor: '#1D4ED8' },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiTextField: { defaultProps: { size: 'medium' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: isDark ? alpha('#0F172A', 0.4) : '#FFFFFF',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
        },
      },
      MuiAvatar: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? '#334155' : '#0F172A',
            fontSize: '0.75rem',
            borderRadius: 8,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: isDark ? alpha('#334155', 0.6) : '#E2E8F0' },
          head: {
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: isDark ? '#94A3B8' : '#64748B',
            backgroundColor: isDark ? alpha('#1E293B', 0.5) : '#F8FAFC',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 20 } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 12 } },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: 8, height: 6 } },
      },
    },
  });

  return theme;
};

// Backward-compatible helper used by a couple of legacy components
export const glassStyles = (isDark) => ({
  glass: {
    backdropFilter: 'blur(10px)',
    background: isDark ? alpha(tokens.surfaceDark, 0.85) : alpha('#FFFFFF', 0.85),
    border: `1px solid ${isDark ? alpha('#334155', 0.6) : '#E2E8F0'}`,
    borderRadius: 2.5,
  },
});
