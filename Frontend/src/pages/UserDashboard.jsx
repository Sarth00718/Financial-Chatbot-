import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Stack, alpha, useTheme
} from '@mui/material';
import {
  ChatBubbleOutline, DescriptionOutlined, AutoAwesomeOutlined,
  Timeline, Insights,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts';

const StatCard = ({ icon: Icon, label, value, color, delay }) => {
  const theme = useTheme();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          borderRadius: 4, 
          height: '100%', 
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: alpha(color, 0.2),
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
          '&:hover': { 
            transform: 'translateY(-4px)',
            boxShadow: `0 12px 24px -8px ${alpha(color, 0.25)}`,
            borderColor: color,
          } 
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(color, 0.15)} 0%, ${alpha(color, 0)} 70%)`,
            zIndex: 0,
          }}
        />
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(color, 0.1), color: color }}>
            <Icon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5, letterSpacing: '-0.03em', color: 'text.primary' }}>
              {value ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
              {label}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper elevation={4} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>{label}</Typography>
        <Typography variant="subtitle2" fontWeight={700} color="primary.main">
          {payload[0].value} Conversations
        </Typography>
      </Paper>
    );
  }
  return null;
};

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
    <Box sx={{ p: { xs: 2, md: 4, lg: 5 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 1 }}>
          Your Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your activity, document insights, and feature usage.
        </Typography>
      </Box>

      {/* Overview stats */}
      {overview && (
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {overview.totalConversations !== undefined && (
            <Grid item xs={12} sm={4}>
              <StatCard icon={ChatBubbleOutline} label="Total Conversations" value={overview.totalConversations} color="#2563EB" delay={0.1} />
            </Grid>
          )}
          {overview.totalMessages !== undefined && (
            <Grid item xs={12} sm={4}>
              <StatCard icon={AutoAwesomeOutlined} label="Messages Sent" value={overview.totalMessages} color="#8B5CF6" delay={0.2} />
            </Grid>
          )}
          {overview.totalDocuments !== undefined && (
            <Grid item xs={12} sm={4}>
              <StatCard icon={DescriptionOutlined} label="Documents Uploaded" value={overview.totalDocuments} color="#10B981" delay={0.3} />
            </Grid>
          )}
        </Grid>
      )}

      <Grid container spacing={4}>
        {/* Usage over time chart */}
        {usageOverTime?.length > 0 && (
          <Grid item xs={12} lg={7}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#2563EB', 0.1), color: '#2563EB' }}>
                    <Timeline fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>Activity Timeline</Typography>
                </Box>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={usageOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha('#94A3B8', 0.2)} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                    <ReTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="conversations" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorConversations)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </motion.div>
          </Grid>
        )}

        {/* Feature usage */}
        {featureUsage?.length > 0 && (
          <Grid item xs={12} lg={5}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#8B5CF6', 0.1), color: '#8B5CF6' }}>
                    <Insights fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>Feature Distribution</Typography>
                </Box>
                <Stack spacing={3}>
                  {featureUsage.map((f, i) => {
                    const maxCount = Math.max(...featureUsage.map(x => x.count));
                    const percentage = Math.min((f.count / maxCount) * 100, 100);
                    const isTop = i === 0;
                    
                    return (
                      <Box key={i}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" fontWeight={600} color={isTop ? 'text.primary' : 'text.secondary'} sx={{ textTransform: 'capitalize' }}>
                            {(f.feature || 'Unknown').replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>{f.count}</Typography>
                        </Box>
                        <Box sx={{ width: '100%', height: 6, bgcolor: alpha('#94A3B8', 0.15), borderRadius: 3, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: 0.6 + (i * 0.1), ease: "easeOut" }}
                            style={{ height: '100%', backgroundColor: isTop ? '#8B5CF6' : '#94A3B8', borderRadius: 12 }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </motion.div>
          </Grid>
        )}
      </Grid>

      {/* Empty state */}
      {!overview && !usageOverTime?.length && !featureUsage?.length && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Paper elevation={0} sx={{ textAlign: 'center', py: 10, px: 3, borderRadius: 4, border: '1px dashed', borderColor: 'divider', bgcolor: alpha('#94A3B8', 0.05) }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: alpha('#2563EB', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              <AutoAwesomeOutlined sx={{ fontSize: 40, color: '#2563EB' }} />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1, letterSpacing: '-0.02em' }}>No analytics yet</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
              Start chatting, uploading documents, and analyzing financial data to see your metrics appear here.
            </Typography>
          </Paper>
        </motion.div>
      )}
    </Box>
  );
};

export default UserDashboard;
