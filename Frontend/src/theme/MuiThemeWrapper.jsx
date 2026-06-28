/**
 * MUI Theme Provider
 * Syncs MUI theme with existing ThemeContext (light/dark)
 */

import { useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useTheme } from '../contexts/ThemeContext';
import { createAppTheme } from '../theme/muiTheme';

const MuiThemeWrapper = ({ children }) => {
  const { theme } = useTheme();
  const muiTheme = useMemo(() => createAppTheme(theme), [theme]);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

export default MuiThemeWrapper;
