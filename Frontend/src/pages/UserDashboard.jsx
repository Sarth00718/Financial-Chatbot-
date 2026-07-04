import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Stack, alpha, Tooltip, IconButton,
} from '@mui/material';
import {
  Chat, Description, AutoAwesome, ArrowForward,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', transition: 'all 0.2s ease', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.06)', borderColor: alpha(color || '#2563EB', 0.3) } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(color || '#2563EB', 0.1) }}>
          <Icon sx={{ fontSize: 18, color: color || '#2563EB' }} />
        </Box>
      </Box>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 0.25, letterSpacing: '-0.02em' }}>{value ?? '—'}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>{label}</Typography>
    </Paper>
  </motion.div>
);

const UserDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await analyticsAPI.getUserAnalytics();
        setAnalytics(res.data.data);
      } catch (err) { console.error('Failed to load analytics:', err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const { overview, usageOverTime, featureUsage } = analytics || {};

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.03em', mb: 0.5 }}>Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Your personal activity overview</Typography>
      </Box>

      {/* Overview stats — only shown when there's data */}
      {overview && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {overview.totalConversations !== undefined && (
            <Grid item xs={6} md={4}>
              <StatCard icon={Chat} label="Conversations" value={overview.totalConversations} color="#2563EB" />
            </Grid>
          )}
          {overview.totalMessages !== undefined && (
            <Grid item xs={6} md={4}>
              <StatCard icon={AutoAwesome} label="Messages sent" value={overview.totalMessages} color="#7C3AED" />
            </Grid>
          )}
          {overview.totalDocuments !== undefined && (
            <Grid item xs={6} md={4}>
              <StatCard icon={Description} label="Documents uploaded" value={overview.totalDocuments} color="#16A34A" />
            </Grid>
          )}
        </Grid>
      )}

      {/* Usage over time chart */}
      {usageOverTime?.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>Conversations over time</Typography>
          </Box>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={usageOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }} />
              <Bar dataKey="conversations" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Feature usage */}
      {featureUsage?.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>Usage by feature</Typography>
          </Box>
          <Stack spacing={1}>
            {featureUsage.map((f, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" sx={{ minWidth: 140, fontSize: '0.8125rem', fontWeight: 500 }}>
                  {(f.feature || 'Unknown').replace(/_/g, ' ')}
                </Typography>
                <Box sx={{ flex: 1, height: 8, bgcolor: alpha('#2563EB', 0.1), borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ width: `${Math.min((f.count / Math.max(...featureUsage.map(x => x.count))) * 100, 100)}%`, height: '100%', bgcolor: '#2563EB', borderRadius: 1, transition: 'width 0.5s ease' }} />
                </Box>
                <Typography variant="caption" fontWeight={700} sx={{ minWidth: 30, textAlign: 'right' }}>{f.count}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Empty state when no data at all */}
      {!overview && !usageOverTime?.length && !featureUsage?.length && (
        <Paper variant="outlined" sx={{ textAlign: 'center', py: 8, borderRadius: 2 }}>
          <AutoAwesome sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>No analytics yet</Typography>
          <Typography variant="body2" color="text.secondary">Start using the chatbot to see your stats here</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default UserDashboard;
