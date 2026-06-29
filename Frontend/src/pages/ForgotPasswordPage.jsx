/**
 * Forgot Password Page
 * MUI + React Hook Form.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Box, Stack, Typography, TextField, InputAdornment, Paper, Container } from '@mui/material';
import { Mail, ArrowBack, CheckCircleOutline, Insights } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const [submittedEmail, setSubmittedEmail] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '' } });

  const onSubmit = async (data) => {
    const result = await forgotPassword(data);
    if (result.success) setSubmittedEmail(data.email);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: 'background.default', position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}><ThemeToggle /></Box>
      <Container maxWidth="xs">
        <Box component={motion.div} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {submittedEmail ? (
            <>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}>
                  <CheckCircleOutline sx={{ color: '#fff', fontSize: 32 }} />
                </Box>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Check Your Email</Typography>
                <Typography variant="body2" color="text.secondary">
                  Reset instructions sent to <strong>{submittedEmail}</strong>
                </Typography>
              </Box>
              <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Didn't receive the email? Check your spam folder or try again.
                </Typography>
                <LoadingButton variant="outlined" fullWidth onClick={() => setSubmittedEmail('')} sx={{ mb: 2 }}>
                  Try another email
                </LoadingButton>
                <Typography component={Link} to="/login" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>
                  <ArrowBack fontSize="small" /> Back to login
                </Typography>
              </Paper>
            </>
          ) : (
            <>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                  <Insights sx={{ color: '#fff', fontSize: 32 }} />
                </Box>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Forgot Password?</Typography>
                <Typography variant="body2" color="text.secondary">No worries — we'll send you reset instructions</Typography>
              </Box>

              <Paper variant="outlined" sx={{ p: 4, borderRadius: 4 }}>
                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Email Address" type="email" fullWidth autoComplete="email" placeholder="you@example.com"
                      error={!!errors.email} helperText={errors.email?.message}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Mail fontSize="small" /></InputAdornment> }}
                      {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })}
                    />
                    <LoadingButton type="submit" variant="contained" size="large" fullWidth loading={isSubmitting}>
                      Send Reset Link
                    </LoadingButton>
                  </Stack>
                </Box>
                <Typography component={Link} to="/login" variant="body2" sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>
                  <ArrowBack fontSize="small" /> Back to login
                </Typography>
              </Paper>
            </>
          )}

          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 3 }}>
            © {new Date().getFullYear()} FinChatBot. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default ForgotPasswordPage;
