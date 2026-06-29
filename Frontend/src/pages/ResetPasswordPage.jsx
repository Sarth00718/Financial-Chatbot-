/**
 * Reset Password Page
 * MUI + React Hook Form.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Box, Stack, Typography, TextField, InputAdornment, IconButton, Paper, Container, Button } from '@mui/material';
import { Lock, Visibility, VisibilityOff, CheckCircleOutline, WarningAmberOutlined, Insights } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const token = searchParams.get('token');

  const [showPwd, setShowPwd] = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data) => {
    const result = await resetPassword({ token, ...data });
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  const Shell = ({ children }) => (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: 'background.default', position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}><ThemeToggle /></Box>
      <Container maxWidth="xs">
        <Box component={motion.div} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>{children}</Box>
      </Container>
    </Box>
  );

  if (!token) {
    return (
      <Shell>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
            <WarningAmberOutlined sx={{ color: '#fff', fontSize: 32 }} />
          </Box>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Invalid Link</Typography>
          <Typography variant="body2" color="text.secondary">This reset link is invalid or has expired.</Typography>
        </Box>
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
          <Button component={Link} to="/forgot-password" variant="contained" size="large" fullWidth>
            Request a New Link
          </Button>
        </Paper>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}>
            <CheckCircleOutline sx={{ color: '#fff', fontSize: 32 }} />
          </Box>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Password Reset!</Typography>
          <Typography variant="body2" color="text.secondary">Your password has been successfully reset.</Typography>
        </Box>
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Redirecting to login page…</Typography>
          <Button component={Link} to="/login" variant="contained" size="large" fullWidth>Go to Login</Button>
        </Paper>
      </Shell>
    );
  }

  return (
    <Shell>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
          <Insights sx={{ color: '#fff', fontSize: 32 }} />
        </Box>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Reset Password</Typography>
        <Typography variant="body2" color="text.secondary">Enter your new password below</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 4, borderRadius: 4 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label="New Password" type={showPwd ? 'text' : 'password'} fullWidth autoComplete="new-password" placeholder="••••••••"
              error={!!errors.password} helperText={errors.password?.message || 'At least 6 characters with uppercase, lowercase & number'}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock fontSize="small" /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPwd((s) => !s)}>{showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton>
                  </InputAdornment>
                ),
              }}
              {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } })}
            />
            <TextField
              label="Confirm New Password" type={showCPwd ? 'text' : 'password'} fullWidth autoComplete="new-password" placeholder="••••••••"
              error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock fontSize="small" /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowCPwd((s) => !s)}>{showCPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton>
                  </InputAdornment>
                ),
              }}
              {...register('confirmPassword', { required: 'Please confirm your password', validate: (v) => v === watch('password') || 'Passwords do not match' })}
            />
            <LoadingButton type="submit" variant="contained" size="large" fullWidth loading={isSubmitting}>
              Reset Password
            </LoadingButton>
          </Stack>
        </Box>
        <Typography component={Link} to="/login" variant="body2" align="center" display="block" sx={{ mt: 3, color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to login
        </Typography>
      </Paper>
    </Shell>
  );
};

export default ResetPasswordPage;
