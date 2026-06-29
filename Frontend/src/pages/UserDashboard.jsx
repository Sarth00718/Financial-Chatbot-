/**
 * User Dashboard — Redesigned
 * Clean enterprise SaaS layout: prominent KPI row, two chart cards, recent activity.
 */

import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Stack, Typography, IconButton, Tooltip,
  Divider, LinearProgress, Chip, Avatar, List, ListItem, ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Forum, BoltOutlined, DescriptionOutlined, TrendingUp, CalendarMonth,
  FileDownloadOutlined, MoreVert, ArrowUpward, ArrowDownward, Chat,
  AccessTime,
} from '@mui/icons-material';
import { conversationAPI } from '../utils/api';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip as ChartTooltip, Legend,
} from 'chart.js';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, ChartTooltip, Legend,
);

/* ─── Stat Card ─────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, color, value, label, trend, trendValue, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35, ease: 'easeOut' }}
  >
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* decorative gradient blob */}
      <Box
        sx={{
          position: 'absolute', top: -24, right: -24,
          width: 96, height: 96, borderRadius: '50%',
          background: (t) => `${t.palette[color]?.main || t.palette.primary.main}18`,
          pointerEvents: 'none',
        }}
      />
      <CardContent sx={{ position: 'relative', zIndex: 1, p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: (t) => `${t.palette[color]?.main || t.palette.primary.main}18`,
            }}
          >
            <Icon sx={{ color: `${color}.main`, fontSize: 20 }} />
          </Box>
          {trend && (
            <Chip
              size="small"
              icon={trend === 'up' ? <ArrowUpward sx={{ fontSize: '11px !important' }} /> : <ArrowDownward sx={{ fontSize: '11px !important' }} />}
              label={trendValue}
              color={trend === 'up' ? 'success' : 'error'}
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.6 } }}
            />
          )}
        </Stack>
        <Typography variant="h4" fontWeight={800} lineHeight={1} sx={{ mb: 0.5 }}>
          {value ?? 0}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: '0.78rem' }}>
          {label}
        </Typography>
      </CardContent>
    </Card>
  </motion.div>
);

/* ─── Chart Card ─────────────────────────────────────────────────────────── */
const ChartCard = ({ icon: Icon, title, subtitle, children, action, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    style={{ height: '100%' }}
  >
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box
              sx={{
                width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #2563EB18, #7C3AED18)',
              }}
            >
              <Icon sx={{ color: 'primary.main', fontSize: 16 }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>{title}</Typography>
              {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            </Box>
          </Stack>
          {action}
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
      </CardContent>
    </Card>
  </motion.div>
);

/* ─── Empty State ─────────────────────────────────────────────────────────── */
const EmptyChart = ({ label = 'No data yet' }) => (
  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', gap: 1 }}>
    <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <TrendingUp sx={{ color: 'text.disabled', fontSize: 22 }} />
    </Box>
    <Typography variant="body2" color="text.disabled">{label}</Typography>
  </Stack>
);

/* ─── Section Header ─────────────────────────────────────────────────────── */
const SectionLabel = ({ children }) => (
  <Typography
    variant="overline"
    color="text.secondary"
    fontWeight={700}
    letterSpacing="0.08em"
    sx={{ mb: 1.5, display: 'block' }}
  >
    {children}
  </Typography>
);

/* ─────────────────────────────────────────────────────────────────────────── */

const UserDashboard = () => {
  const { isDark } = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [recentConvs, setRecentConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const chartColors = {
    textMuted: isDark ? '#475569' : '#94a3b8',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    border: isDark ? '#1e293b' : '#f1f5f9',
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, convsRes] = await Promise.allSettled([
        analyticsAPI.getUserAnalytics(),
        conversationAPI.getAll(),
      ]);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data.data);
      if (convsRes.status === 'fulfilled') {
        const convs = convsRes.value.data.data || [];
        setRecentConvs(convs.slice(0, 5));
      }
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      const response = await analyticsAPI.exportAnalytics(format);
      const blob =
        format === 'csv'
          ? response.data
          : new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-analytics-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Exported successfully');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <DashboardSkeleton />;

  /* filter out null feature entries from MongoDB aggregation */
  const cleanFeatureData = (analytics?.featureUsage || []).filter(
    (f) => f.feature && f.feature !== 'null',
  );
  const cleanFeature = (name) =>
    (name || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const lineData = {
    labels: analytics?.usageOverTime?.map((d) => d.month) || [],
    datasets: [
      {
        label: 'Conversations',
        data: analytics?.usageOverTime?.map((d) => d.conversations) || [],
        borderColor: '#2563EB',
        backgroundColor: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.08)',
        tension: 0.45,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: '#2563EB',
        pointBorderColor: isDark ? '#1e293b' : '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const barData = {
    labels: cleanFeatureData.map((f) => cleanFeature(f.feature)),
    datasets: [
      {
        label: 'Usage Count',
        data: cleanFeatureData.map((f) => f.count),
        backgroundColor: [
          'rgba(37,99,235,0.85)',
          'rgba(22,163,74,0.85)',
          'rgba(245,158,11,0.85)',
          'rgba(124,58,237,0.85)',
          'rgba(220,38,38,0.85)',
        ],
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const chartOpts = (legend = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: legend, labels: { color: chartColors.textSecondary, boxWidth: 12, padding: 16 } },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#0f172a',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: isDark ? '#334155' : '#1e293b',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: chartColors.textMuted, font: { size: 11 } },
        grid: { color: chartColors.border },
        border: { display: false },
      },
      x: {
        ticks: { color: chartColors.textMuted, font: { size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
    },
  });

  return (
    <Box sx={{ width: '100%', p: { xs: 2, sm: 2.5, md: 3 }, maxWidth: 1280, mx: 'auto' }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          gap={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h5" fontWeight={800} lineHeight={1.2}>My Dashboard</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Your personal usage statistics and activity overview
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <Tooltip title="Export CSV">
              <IconButton
                size="small"
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
              >
                <FileDownloadOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export JSON">
              <IconButton
                size="small"
                onClick={() => handleExport('json')}
                disabled={isExporting}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </motion.div>

      {/* ── KPI row ───────────────────────────────────────────────────── */}
      <SectionLabel>Overview</SectionLabel>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard icon={Forum} color="info" value={analytics?.overview?.totalConversations}
            label="Total Conversations" trend="up" trendValue="+12%" delay={0.05} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard icon={BoltOutlined} color="success" value={analytics?.overview?.totalMessages}
            label="Messages Sent" trend="up" trendValue="+8%" delay={0.1} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard icon={DescriptionOutlined} color="warning" value={analytics?.overview?.totalDocuments}
            label="Documents Analyzed" delay={0.15} />
        </Grid>
      </Grid>

      {/* ── Charts ────────────────────────────────────────────────────── */}
      <SectionLabel>Activity</SectionLabel>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <ChartCard
            icon={TrendingUp}
            title="Usage Over Time"
            subtitle="Monthly conversation volume"
            delay={0.2}
          >
            <Box sx={{ height: 240 }}>
              {analytics?.usageOverTime?.length > 0
                ? <Line data={lineData} options={chartOpts()} />
                : <EmptyChart label="Start chatting to see trends" />}
            </Box>
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <ChartCard
            icon={CalendarMonth}
            title="Feature Usage"
            subtitle="Most-used capabilities"
            delay={0.25}
          >
            <Box sx={{ height: 240 }}>
              {cleanFeatureData.length > 0
                ? <Bar data={barData} options={chartOpts(true)} />
                : <EmptyChart label="No feature data available" />}
            </Box>
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── Usage breakdown ───────────────────────────────────────────── */}
      {cleanFeatureData.length > 0 && (
        <>
          <SectionLabel>Breakdown</SectionLabel>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
          >
            <Card>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                  Feature Distribution
                </Typography>
                <Stack spacing={2}>
                  {cleanFeatureData.map((f, i) => {
                    const total = cleanFeatureData.reduce((s, x) => s + (x.count || 0), 0);
                    const pct = total > 0 ? Math.round((f.count / total) * 100) : 0;
                    const colors = ['#2563EB', '#16A34A', '#F59E0B', '#7C3AED', '#DC2626'];
                    return (
                      <Box key={i}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                          <Typography variant="body2" fontWeight={600}>{cleanFeature(f.feature)}</Typography>
                          <Stack direction="row" alignItems="center" gap={1.5}>
                            <Typography variant="body2" color="text.secondary">{f.count}</Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ minWidth: 32, textAlign: 'right' }}>{pct}%</Typography>
                          </Stack>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 6, borderRadius: 3,
                            bgcolor: isDark ? '#1e293b' : '#f1f5f9',
                            '& .MuiLinearProgress-bar': { bgcolor: colors[i % colors.length], borderRadius: 3 },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* ── Recent Conversations ───────────────────────────────────────── */}
      {recentConvs.length > 0 && (
        <>
          <SectionLabel>Recent Conversations</SectionLabel>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.35 }}
          >
            <Card>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <List dense disablePadding>
                  {recentConvs.map((conv, i) => (
                    <Box key={conv._id || i}>
                      <ListItem disablePadding sx={{ py: 1 }}>
                        <ListItemAvatar sx={{ minWidth: 44 }}>
                          <Avatar sx={{
                            width: 34, height: 34,
                            background: 'linear-gradient(135deg, #2563EB18, #7C3AED18)',
                          }}>
                            <Chat sx={{ color: 'primary.main', fontSize: 16 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={conv.title || 'Untitled'}
                          secondary={
                            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.25 }}>
                              {conv.featureUsed && conv.featureUsed !== 'null' && (
                                <Chip
                                  size="small"
                                  label={cleanFeature(conv.featureUsed)}
                                  variant="outlined"
                                  sx={{ height: 16, fontSize: '0.6rem' }}
                                />
                              )}
                              <Stack direction="row" alignItems="center" gap={0.5}>
                                <AccessTime sx={{ fontSize: 11, color: 'text.disabled' }} />
                                <Typography variant="caption" color="text.disabled">
                                  {conv.updatedAt
                                    ? new Date(conv.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    : ''}
                                </Typography>
                              </Stack>
                            </Stack>
                          }
                          slotProps={{
                            primary: { variant: 'body2', fontWeight: 600, noWrap: true },
                            secondary: { component: 'div' },
                          }}
                        />
                      </ListItem>
                      {i < recentConvs.length - 1 && <Divider component="li" />}
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </Box>
  );
};

export default UserDashboard;
