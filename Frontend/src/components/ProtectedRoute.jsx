/**
 * Protected Route
 * Redirects to /login if not authenticated. MUI-based loading screen.
 */

import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Insights } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'background.default',
        }}
      >
        <Box
          sx={{
            width: 56, height: 56, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
          }}
        >
          <Insights sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Loading…
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
