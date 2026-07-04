import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Stack, alpha, Chip,
} from '@mui/material';
import {
  Assessment, People, AutoAwesome, ShowChart, Forum,
  Description, TrendingUp, Category,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { analyticsAPI, enterpriseAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#2563EB', '#7C3AED', '#16A34A', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#14B8A6'];

const KpiCard = ({ icon: Icon, label, value, color }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(color || '#2563EB', 0.1) }}>
          <Icon sx={{ fontSize: 18, color: color || '#2563EB' }} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value ?? '—'}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>{label}</Typography>
        </Box>
      </Box>
    </Paper>
  </motion.div>
);

const ExecutiveDashboard = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analysisTypes, setAnalysisTypes] = useState([]);
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [typesRes] = await Promise.all([
          enterpriseAPI.getAnalysisTypes().catch(() => ({ data: { data: { analysisTypes: [] } } })),
        ]);
        setAnalysisTypes(typesRes.data?.data?.analysisTypes || []);
        if (isAdmin) {
          try {
            const adminRes = await analyticsAPI.getAdminAnalytics();
            setAdminAnalytics(adminRes.data.data);
          } catch {}
        } else {
          try {
            const userRes = await analyticsAPI.getUserAnalytics();
            setUserAnalytics(userRes.data.data);
          } catch {}
        }
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, [isAdmin]);

  if (loading) return <DashboardSkeleton />;

  const isExecutive = isAdmin && adminAnalytics;
  const isUser = !isAdmin && userAnalytics;

  const overview = userAnalytics?.overview;
  const featureUsage = adminAnalytics?.featureUsage || userAnalytics?.featureUsage || [];
  const activityData = adminAnalytics?.activityOverTime || userAnalytics?.usageOverTime || [];
  const userGrowth = adminAnalytics?.userGrowth || [];
  const docTypes = adminAnalytics?.documentTypes || [];

  const totalUsers = userGrowth.reduce((s, u) => s + (u.users || 0), 0);
  const totalConversations = activityData.reduce((s, a) => s + (a.conversations || 0), 0);
  const totalFeatureOps = featureUsage.reduce((s, f) => s + (f.count || 0), 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.03em', mb: 0.25 }}>
          Executive Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isExecutive
            ? 'System-wide performance metrics and business intelligence'
            : 'Your account analytics and usage overview'
          }
        </Typography>
      </Box>

      {/* KPIs */}
      {(isExecutive || isUser) && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {isExecutive && (
            <>
              <Grid item xs={6} sm={3}>
                <KpiCard icon={People} label="Total Users" value={totalUsers} color="#2563EB" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard icon={Forum} label="Conversations" value={totalConversations} color="#7C3AED" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard icon={AutoAwesome} label="Analysis Runs" value={totalFeatureOps} color="#16A34A" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard icon={Category} label="Doc Types" value={docTypes.length || '—'} color="#F59E0B" />
              </Grid>
            </>
          )}
          {isUser && overview && (
            <>
              <Grid item xs={4}>
                <KpiCard icon={Forum} label="Conversations" value={overview.totalConversations || 0} color="#2563EB" />
              </Grid>
              <Grid item xs={4}>
                <KpiCard icon={Assessment} label="Messages Sent" value={overview.totalMessages || 0} color="#7C3AED" />
              </Grid>
              <Grid item xs={4}>
                <KpiCard icon={Description} label="Documents" value={overview.totalDocuments || 0} color="#16A34A" />
              </Grid>
            </>
          )}
        </Grid>
      )}

      {featureUsage.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Feature Usage</Typography>
          <Stack spacing={1.25}>
            {featureUsage.map((f, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length], flexShrink: 0 }} />
                <Typography variant="body2" sx={{ minWidth: 130, fontSize: '0.8125rem', fontWeight: 500 }}>
                  {(f.feature || 'Unknown').replace(/_/g, ' ')}
                </Typography>
                <Box sx={{ flex: 1, height: 10, bgcolor: alpha(COLORS[i % COLORS.length], 0.1), borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ width: `${Math.min((f.count / Math.max(...featureUsage.map(x => x.count))) * 100, 100)}%`, height: '100%', bgcolor: COLORS[i % COLORS.length], borderRadius: 1, transition: 'width 0.5s ease' }} />
                </Box>
                <Typography variant="caption" fontWeight={700} sx={{ minWidth: 30, textAlign: 'right' }}>{f.count}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {activityData.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>Activity Over Time</Typography>
          </Box>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }} />
              <Bar dataKey={activityData[0]?.conversations !== undefined ? 'conversations' : 'count'} fill="#2563EB" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {docTypes.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Document Types</Typography>
          <Stack spacing={1}>
            {docTypes.map((d, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" sx={{ minWidth: 100, fontSize: '0.8125rem', fontWeight: 500, textTransform: 'capitalize' }}>
                  {d.type || 'Unknown'}
                </Typography>
                <Box sx={{ flex: 1, height: 8, bgcolor: alpha(COLORS[i % COLORS.length], 0.1), borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ width: `${Math.min((d.count / Math.max(...docTypes.map(x => x.count))) * 100, 100)}%`, height: '100%', bgcolor: COLORS[i % COLORS.length], borderRadius: 1, transition: 'width 0.5s ease' }} />
                </Box>
                <Typography variant="caption" fontWeight={700} sx={{ minWidth: 30, textAlign: 'right' }}>{d.count}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {userGrowth.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>User Growth</Typography>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }} />
              <Bar dataKey="users" fill="#16A34A" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {analysisTypes.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Available Analysis Modes</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {analysisTypes.map((t) => (
              <Chip key={t} label={(t || '').replace(/_/g, ' ')} size="small" variant="outlined" sx={{ fontSize: '0.75rem', fontWeight: 500 }} />
            ))}
          </Box>
        </Paper>
      )}

      {!isExecutive && !isUser && !featureUsage.length && !activityData.length && (
        <Paper variant="outlined" sx={{ textAlign: 'center', py: 8, borderRadius: 2 }}>
          <TrendingUp sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>No data yet</Typography>
          <Typography variant="body2" color="text.secondary">Start using FinChatBot to see your analytics here</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ExecutiveDashboard;
