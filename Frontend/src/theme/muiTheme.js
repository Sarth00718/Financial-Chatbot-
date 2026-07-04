import { createTheme } from '@mui/material/styles';
import { alpha } from '@mui/system';

export const tokens = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  secondary: '#7C3AED',
  secondaryLight: '#8B5CF6',
  secondaryDark: '#6D28D9',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#0EA5E9',
  bgLight: '#F0F2F5',
  surfaceLight: '#FFFFFF',
  surfaceSubtleLight: '#F8F9FB',
  bgDark: '#0B0D14',
  surfaceDark: '#141720',
  surfaceSubtleDark: '#1A1D2B',
};

export const createAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark';

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: tokens.primary,
        light: tokens.primaryLight,
        dark: tokens.primaryDark,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: tokens.secondary,
        light: tokens.secondaryLight,
        dark: tokens.secondaryDark,
        contrastText: '#FFFFFF',
      },
      success: { main: tokens.success, light: '#22C55E', dark: '#15803D' },
      warning: { main: tokens.warning, light: '#FBBF24', dark: '#B45309' },
      error: { main: tokens.danger, light: '#EF4444', dark: '#B91C1C' },
      info: { main: tokens.info },
      background: {
        default: isDark ? tokens.bgDark : tokens.bgLight,
        paper: isDark ? tokens.surfaceDark : tokens.surfaceLight,
      },
      text: {
        primary: isDark ? '#EDF2F7' : '#0A0D14',
        secondary: isDark ? '#94A3B8' : '#4A5568',
        disabled: isDark ? '#475569' : '#94A3B8',
      },
      divider: isDark ? alpha('#1E2235', 0.8) : alpha('#E2E8F0', 0.8),
      action: {
        hover: isDark ? alpha('#FFFFFF', 0.05) : alpha('#0A0D14', 0.04),
        selected: isDark ? alpha(tokens.primary, 0.2) : alpha(tokens.primary, 0.08),
        focus: isDark ? alpha('#FFFFFF', 0.08) : alpha('#0A0D14', 0.06),
      },
    },

    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 1.4rem + 1vw, 2.5rem)', lineHeight: 1.2 },
      h2: { fontWeight: 700, letterSpacing: '-0.02em', fontSize: 'clamp(1.5rem, 1.2rem + 1vw, 2rem)', lineHeight: 1.25 },
      h3: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: '1.375rem', lineHeight: 1.3 },
      h4: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: '1.125rem', lineHeight: 1.35 },
      h5: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.4 },
      h6: { fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.4 },
      subtitle1: { fontWeight: 600, fontSize: '0.9375rem' },
      subtitle2: { fontWeight: 600, fontSize: '0.8125rem', letterSpacing: '0.01em' },
      body1: { fontSize: '0.9375rem', lineHeight: 1.65 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.55 },
      button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' },
      caption: { fontSize: '0.75rem', lineHeight: 1.4 },
      overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' },
    },

    shape: { borderRadius: 10 },

    spacing: 8,

    breakpoints: {
      values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
    },

    shadows: [
      'none',
      isDark ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 2px rgba(10,13,20,0.04)',
      isDark ? '0 1px 3px rgba(0,0,0,0.35)' : '0 1px 3px rgba(10,13,20,0.06)',
      isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(10,13,20,0.08)',
      isDark ? '0 4px 16px rgba(0,0,0,0.45)' : '0 4px 16px rgba(10,13,20,0.10)',
      isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(10,13,20,0.12)',
      ...Array(19).fill(isDark ? '0 1px 3px rgba(0,0,0,0.35)' : '0 1px 3px rgba(10,13,20,0.06)'),
    ],

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? '#1E2235 transparent' : '#CBD5E1 transparent',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: isDark ? alpha('#1E2235', 0.8) : '#E2E8F0' },
        },
        defaultProps: { elevation: 0 },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${isDark ? alpha('#1E2235', 0.8) : '#E2E8F0'}`,
            boxShadow: isDark
              ? '0 1px 2px rgba(0,0,0,0.3)'
              : '0 1px 2px rgba(10,13,20,0.04)',
            transition: 'box-shadow 0.15s ease, transform 0.15s ease',
            '&:hover': {
              boxShadow: isDark
                ? '0 4px 16px rgba(0,0,0,0.4)'
                : '0 4px 16px rgba(10,13,20,0.08)',
            },
          },
        },
      },
      MuiCardContent: { styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } } },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? alpha(tokens.surfaceDark, 0.85) : alpha('#FFFFFF', 0.85),
            backdropFilter: 'blur(12px)',
            color: isDark ? '#EDF2F7' : '#0A0D14',
            borderBottom: `1px solid ${isDark ? alpha('#1E2235', 0.8) : '#E2E8F0'}`,
          },
        },
        defaultProps: { elevation: 0 },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? tokens.bgDark : '#FFFFFF',
            borderRight: `1px solid ${isDark ? alpha('#1E2235', 0.8) : '#E2E8F0'}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: 'none',
            paddingInline: 16,
            height: 38,
            fontSize: '0.875rem',
            fontWeight: 600,
            '&:hover': { boxShadow: 'none' },
            '&:active': { transform: 'scale(0.98)' },
          },
          sizeSmall: { height: 30, fontSize: '0.8125rem', paddingInline: 12 },
          sizeLarge: { height: 46, fontSize: '0.9375rem', paddingInline: 24 },
          containedPrimary: {
            background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.primaryDark} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, ${tokens.primaryDark} 0%, ${tokens.primary} 100%)` },
          },
          outlined: {
            borderWidth: 1.5,
            '&:hover': { borderWidth: 1.5 },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: 'all 0.15s ease',
          },
        },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: isDark ? alpha('#0B0D14', 0.5) : '#FFFFFF',
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? '#334155' : '#CBD5E1' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1.5 },
          },
          notchedOutline: { borderColor: isDark ? alpha('#1E2235', 0.8) : '#E2E8F0' },
          input: { '&::placeholder': { color: isDark ? '#64748B' : '#94A3B8', opacity: 1 } },
        },
      },
      MuiInputLabel: {
        styleOverrides: { root: { fontWeight: 500, fontSize: '0.875rem' } },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 6, height: 24 },
          sizeSmall: { height: 20, fontSize: '0.6875rem' },
        },
      },
      MuiAvatar: {
        styleOverrides: { root: { fontWeight: 700, fontSize: '0.875rem' } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? '#1E2235' : '#0A0D14',
            fontSize: '0.75rem',
            borderRadius: 6,
            padding: '4px 10px',
          },
          arrow: { color: isDark ? '#1E2235' : '#0A0D14' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isDark ? alpha('#1E2235', 0.8) : '#E2E8F0',
            padding: '12px 16px',
          },
          head: {
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: isDark ? '#94A3B8' : '#64748B',
            backgroundColor: isDark ? alpha('#1A1D2B', 0.5) : '#F8F9FB',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.15s ease',
            '&:hover': { backgroundColor: isDark ? alpha('#FFFFFF', 0.02) : alpha('#0A0D14', 0.02) },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            marginBottom: 1,
            '&.Mui-selected': {
              backgroundColor: isDark ? alpha(tokens.primary, 0.15) : alpha(tokens.primary, 0.08),
              '&:hover': { backgroundColor: isDark ? alpha(tokens.primary, 0.2) : alpha(tokens.primary, 0.12) },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 14 },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontWeight: 700, fontSize: '1.125rem', padding: '20px 24px 0' } },
      },
      MuiDialogContent: {
        styleOverrides: { root: { padding: '16px 24px' } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: '12px 24px 20px', gap: 8 } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: 4, height: 4 } },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 2, borderRadius: 1 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            minHeight: 40,
            paddingInline: 16,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 10,
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.5)'
              : '0 8px 32px rgba(10,13,20,0.12)',
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: { width: 40, height: 22, padding: 0, '& .MuiSwitch-switchBase': { padding: 2 } },
          thumb: { width: 18, height: 18 },
          track: { borderRadius: 11 },
        },
      },
    },
  });

  return theme;
};

export const glassStyles = (isDark) => ({
  glass: {
    backdropFilter: 'blur(12px)',
    background: isDark ? alpha(tokens.surfaceDark, 0.75) : alpha('#FFFFFF', 0.7),
    border: `1px solid ${isDark ? alpha('#1E2235', 0.6) : alpha('#E2E8F0', 0.5)}`,
    borderRadius: 2,
  },
});
