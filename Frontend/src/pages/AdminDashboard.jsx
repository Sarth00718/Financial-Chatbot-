/**
 * Admin Dashboard — Layout Fixed
 *
 * Layout fixes:
 * - Root Box uses width:'100%' not maxWidth alone (prevents overflow)
 * - KPI cards: xs={6} md={3} — 4 columns at md (900px viewport / ~640px content)
 * - Health/Activity: xs={12} lg={5} / lg={7} — side-by-side only at lg
 * - Chart pairs: xs={12} lg={6} — stack on small screens, side-by-side at lg
 * - All grids use spacing={2} to prevent gutter overflow
 *
 * Data fixes:
 * - Charts use analyticsAPI.getAdminAnalytics() — properly formatted data
 * - Null featureUsed values filtered before chart render
 * - Backend health bug fixed: mongoose.connection.readyState
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Stack, Typography, IconButton, Tooltip,
  TextField, InputAdornment, MenuItem, Select, Chip, Avatar,
  Divider, List, ListItem, ListItemAvatar, ListItemText,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  GroupOutlined, BoltOutlined, ForumOutlined, DescriptionOutlined,
  Shield, FileDownloadOutlined, Search, Block, CheckCircle,
  DeleteOutline, ManageAccountsOutlined, TrendingUp,
  BarChart as BarChartIcon, PieChartOutline, ArrowUpward,
  HealthAndSafety, Memory, AccessTime, Chat, EmojiEvents,
  FiberManualRecord,
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip as ChartTooltip, Legend,
} from 'chart.js';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI, analyticsAPI } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, ChartTooltip, Legend,
);

/* ─── helpers ────────────────────────────────────────────────────────────── */
const cleanFeature = (name) =>
  (name || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatUptime = (seconds) => {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/* ─── Stat Card ─────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, color, value, label, badge, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{
        position: 'absolute', top: -18, right: -18, width: 72, height: 72, borderRadius: '50%',
        background: (t) => `${t.palette[color]?.main || t.palette.primary.main}15`,
        pointerEvents: 'none',
      }} />
      <CardContent sx={{ position: 'relative', zIndex: 1, p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: (t) => `${t.palette[color]?.main || t.palette.primary.main}18`,
          }}>
            <Icon sx={{ color: `${color}.main`, fontSize: 20 }} />
          </Box>
          {badge && (
            <Chip
              size="small"
              icon={<ArrowUpward sx={{ fontSize: '11px !important' }} />}
              label={badge}
              color="success"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.62rem', '& .MuiChip-label': { px: 0.6 } }}
            />
          )}
        </Stack>
        <Typography variant="h4" fontWeight={800} lineHeight={1} sx={{ mb: 0.5 }}>{value ?? 0}</Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: '0.78rem' }}>
          {label}
        </Typography>
      </CardContent>
    </Card>
  </motion.div>
);

/* ─── Chart Card ─────────────────────────────────────────────────────────── */
const ChartCard = ({ icon: Icon, title, subtitle, children, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }} style={{ height: '100%' }}>
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 2 }}>
          <Box sx={{
            width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #2563EB18, #7C3AED18)',
          }}>
            <Icon sx={{ color: 'primary.main', fontSize: 16 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2} noWrap>{title}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary" noWrap>{subtitle}</Typography>}
          </Box>
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
      </CardContent>
    </Card>
  </motion.div>
);

/* ─── Empty chart ────────────────────────────────────────────────────────── */
const NoData = ({ label = 'No data yet' }) => (
  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', gap: 1 }}>
    <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <BarChartIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
    </Box>
    <Typography variant="caption" color="text.disabled">{label}</Typography>
  </Stack>
);

/* ─── Section label ──────────────────────────────────────────────────────── */
const SectionLabel = ({ children }) => (
  <Typography variant="overline" color="text.secondary" fontWeight={700}
    letterSpacing="0.08em" sx={{ mb: 1.5, display: 'block', fontSize: '0.68rem' }}>
    {children}
  </Typography>
);

/* ─────────────────────────────────────────────────────────────────────────── */

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { isDark } = useTheme();

  const chartColors = {
    textMuted:     isDark ? '#475569' : '#94a3b8',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    border:        isDark ? '#1e293b' : '#f1f5f9',
  };

  const [stats,        setStats]        = useState(null);
  const [analytics,    setAnalytics]    = useState(null);
  const [health,       setHealth]       = useState(null);
  const [logs,         setLogs]         = useState([]);
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterRole,   setFilterRole]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isExporting,  setIsExporting]  = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        adminAPI.getStatistics(),
        adminAPI.getUsers({ page: 1, limit: 100 }),
        analyticsAPI.getAdminAnalytics(),
        adminAPI.getHealth(),
        adminAPI.getLogs({ limit: 10 }),
      ]);
      if (results[0].status === 'fulfilled') setStats(results[0].value.data.data);
      if (results[1].status === 'fulfilled') setUsers(results[1].value.data.data.users || []);
      if (results[2].status === 'fulfilled') setAnalytics(results[2].value.data.data);
      if (results[3].status === 'fulfilled') setHealth(results[3].value.data.data);
      if (results[4].status === 'fulfilled') setLogs(results[4].value.data.data.activities || []);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      const response = await analyticsAPI.exportAnalytics(format);
      const blob = format === 'csv'
        ? response.data
        : new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-analytics-${Date.now()}.${format}`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
    finally { setIsExporting(false); }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await adminAPI.toggleUserStatus(userId, !currentStatus);
      toast.success(`User ${!currentStatus ? 'activated' : 'blocked'}`);
      fetchData();
    } catch { toast.error('Failed to update status'); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await adminAPI.updateUserRole(userId, newRole);
      toast.success('Role updated');
      fetchData();
    } catch { toast.error('Failed to update role'); }
  };

  const filteredUsers = (users || []).filter((u) => {
    if (!u) return false;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q);
    const matchesRole   = !filterRole || u.role === filterRole;
    const matchesStatus = filterStatus === '' || (u.isActive !== undefined && u.isActive.toString() === filterStatus);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const rows = useMemo(() => filteredUsers.map((u) => ({ id: u._id, ...u })), [filteredUsers]);

  const columns = [
    {
      field: 'name', headerName: 'User', flex: 1, minWidth: 180,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" gap={1.25} sx={{ py: 0.75 }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', fontWeight: 700 }}>
            {(params.row.name||'U').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.8125rem' }}>{params.row.name||'Unnamed'}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{params.row.email}</Typography>
          </Box>
        </Stack>
      ),
    },
    { field: 'role', headerName: 'Role', width: 100,
      renderCell: (p) => <Chip size="small" label={p.value||'user'} color={p.value==='admin'?'primary':'default'} variant="outlined" /> },
    { field: 'isActive', headerName: 'Status', width: 100,
      renderCell: (p) => <Chip size="small" label={p.value?'Active':'Blocked'} color={p.value?'success':'error'} variant="outlined" /> },
    { field: 'createdAt', headerName: 'Joined', width: 110,
      valueFormatter: (v) => v ? new Date(v).toLocaleDateString() : '' },
    {
      field: 'actions', headerName: 'Actions', width: 130, sortable: false, filterable: false,
      renderCell: (params) => {
        const u = params.row;
        if (u._id === user?._id) return <Chip size="small" label="You" variant="outlined" sx={{ height: 20 }} />;
        return (
          <Stack direction="row" gap={0.25}>
            <Tooltip title={u.isActive ? 'Block' : 'Activate'}>
              <IconButton size="small" color={u.isActive?'error':'success'} onClick={() => handleToggleStatus(u._id, u.isActive)}>
                {u.isActive ? <Block sx={{ fontSize: 16 }}/> : <CheckCircle sx={{ fontSize: 16 }}/>}
              </IconButton>
            </Tooltip>
            <Tooltip title={`Make ${u.role==='admin'?'User':'Admin'}`}>
              <IconButton size="small" color="primary" onClick={() => handleUpdateRole(u._id, u.role==='admin'?'user':'admin')}>
                <ManageAccountsOutlined sx={{ fontSize: 16 }}/>
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => handleDeleteUser(u._id)}>
                <DeleteOutline sx={{ fontSize: 16 }}/>
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  if (loading) return <DashboardSkeleton />;

  /* ── Chart option factories ─────────────────────────────────────── */
  const baseTooltip = {
    backgroundColor: isDark ? '#1e293b' : '#0f172a',
    titleColor: '#f1f5f9', bodyColor: '#94a3b8',
    borderColor: isDark ? '#334155' : '#1e293b', borderWidth: 1,
    padding: 10, cornerRadius: 8,
  };
  const scaleBase = {
    y: {
      beginAtZero: true,
      ticks: { color: chartColors.textMuted, font: { size: 10 } },
      grid: { color: chartColors.border },
      border: { display: false },
    },
    x: {
      ticks: { color: chartColors.textMuted, font: { size: 10 }, maxRotation: 30 },
      grid: { display: false },
      border: { display: false },
    },
  };
  const lineOpts = () => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: baseTooltip },
    scales: scaleBase,
  });
  const barOpts = () => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: baseTooltip },
    scales: scaleBase,
  });
  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: chartColors.textSecondary, boxWidth: 10, padding: 14, font: { size: 11 } } },
      tooltip: baseTooltip,
    },
  };

  /* ── Cleaned chart data ─────────────────────────────────────────── */
  const featureData = (analytics?.featureUsage||[]).filter(f => f.feature && f.feature !== 'null');
  const docTypeData = (analytics?.documentTypes||[]).filter(d => d.type && d.type !== 'null');
  const P_BLUE = ['rgba(37,99,235,.85)','rgba(22,163,74,.85)','rgba(245,158,11,.85)','rgba(124,58,237,.85)','rgba(220,38,38,.85)'];
  const P_WARM = ['rgba(245,158,11,.85)','rgba(220,38,38,.85)','rgba(22,163,74,.85)','rgba(37,99,235,.85)','rgba(124,58,237,.85)'];
  const dbColor = health?.database === 'connected' ? 'success' : 'error';

  return (
    /* width:'100%' is critical — prevents content from growing past the flex container */
    <Box sx={{ width: '100%', p: { xs: 2, sm: 2.5, md: 3 } }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg,#2563EB,#7C3AED)',
            }}>
              <Shield sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography variant="h6" fontWeight={800} lineHeight={1.2}>Admin Dashboard</Typography>
                <Chip label="Admin" size="small" color="primary" sx={{ height: 18, fontSize: '0.62rem' }} />
              </Stack>
              <Typography variant="caption" color="text.secondary">Manage users &amp; monitor system health</Typography>
            </Box>
          </Stack>
          <Stack direction="row" gap={1}>
            <Tooltip title="Export CSV">
              <IconButton size="small" onClick={() => handleExport('csv')} disabled={isExporting}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <FileDownloadOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export JSON">
              <IconButton size="small" onClick={() => handleExport('json')} disabled={isExporting}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <DescriptionOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </motion.div>

      {/* ── KPI row — 4 cards, 2 cols on xs/sm, 4 cols on md+ ──── */}
      <SectionLabel>System Overview</SectionLabel>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { icon: GroupOutlined,    color: 'info',    value: stats?.overview?.totalUsers,         label: 'Total Users',          badge: `+${stats?.overview?.recentRegistrations??0} this month` },
          { icon: BoltOutlined,     color: 'success', value: stats?.overview?.activeUsers,        label: 'Active Users',         badge: `${stats?.overview?.activeUsersLastWeek??0} this week` },
          { icon: ForumOutlined,    color: 'primary', value: stats?.overview?.totalConversations, label: 'Conversations',        badge: null },
          { icon: DescriptionOutlined, color: 'warning', value: stats?.overview?.totalDocuments,  label: 'Docs Processed',       badge: null },
        ].map((card, i) => (
          <Grid item xs={6} md={3} key={i}>
            <StatCard {...card} delay={0.04 * (i + 1)} />
          </Grid>
        ))}
      </Grid>

      {/* ── System Status ────────────────────────────────────────── */}
      <SectionLabel>System Status</SectionLabel>
      <Grid container spacing={2} sx={{ mb: 3 }}>

        {/* Health card */}
        <Grid item xs={12} lg={4}>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ height: '100%' }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 2.5 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'success.main' + '18' }}>
                    <HealthAndSafety sx={{ color: 'success.main', fontSize: 16 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>System Health</Typography>
                    <Typography variant="caption" color="text.secondary">Live server status</Typography>
                  </Box>
                </Stack>
                <Stack spacing={1.75}>
                  {[
                    { label: 'Database', value: health?.database || 'unknown', chip: true, color: dbColor },
                    { label: 'Uptime',   value: formatUptime(health?.uptime), chip: false },
                    ...(health?.memory ? [
                      { label: 'Heap Used', value: health.memory.heapUsed, chip: false },
                      { label: 'RSS',       value: health.memory.rss,      chip: false },
                    ] : []),
                  ].map((row, i) => (
                    <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" alignItems="center" gap={0.75}>
                        {row.chip
                          ? <FiberManualRecord sx={{ fontSize: 9, color: `${row.color}.main` }} />
                          : row.label === 'Uptime'
                            ? <AccessTime sx={{ fontSize: 13, color: 'text.disabled' }} />
                            : <Memory sx={{ fontSize: 13, color: 'text.disabled' }} />}
                        <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                      </Stack>
                      {row.chip
                        ? <Chip size="small" label={row.value} color={row.color} variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
                        : <Typography variant="caption" fontWeight={700}>{row.value}</Typography>}
                    </Stack>
                  ))}
                  {!health && (
                    <Typography variant="caption" color="text.disabled" textAlign="center" sx={{ pt: 1, display: 'block' }}>
                      Health data unavailable
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} lg={8}>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ height: '100%' }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 2 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#2563EB18,#7C3AED18)' }}>
                    <Chat sx={{ color: 'primary.main', fontSize: 16 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>Recent Activity</Typography>
                    <Typography variant="caption" color="text.secondary">Latest conversations across all users</Typography>
                  </Box>
                </Stack>
                {logs.length === 0 ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.disabled">No activity yet</Typography>
                  </Stack>
                ) : (
                  <List dense disablePadding>
                    {logs.slice(0, 6).map((log, i) => (
                      <ListItem key={log._id||i} disablePadding sx={{ py: 0.5 }}>
                        <ListItemAvatar sx={{ minWidth: 38 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', fontWeight: 700 }}>
                            {(log.user?.name||'?').charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.8rem' }}>{log.title||'Untitled'}</Typography>}
                          secondary={
                            <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                              {log.user?.name && <Typography variant="caption" color="text.secondary">{log.user.name}</Typography>}
                              {log.featureUsed && log.featureUsed !== 'null' && (
                                <Chip label={cleanFeature(log.featureUsed)} size="small" sx={{ height: 15, fontSize: '0.58rem', '& .MuiChip-label': { px: 0.5 } }} />
                              )}
                              <Typography variant="caption" color="text.disabled">
                                {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ''}
                              </Typography>
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Analytics Charts ─────────────────────────────────────── */}
      <SectionLabel>Analytics</SectionLabel>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <ChartCard icon={TrendingUp} title="User Growth" subtitle="New registrations per month" delay={0.3}>
            <Box sx={{ height: 240 }}>
              {analytics?.userGrowth?.length > 0 ? (
                <Line
                  data={{
                    labels: analytics.userGrowth.map(d => d.month),
                    datasets: [{
                      data: analytics.userGrowth.map(d => d.users),
                      borderColor: '#2563EB',
                      backgroundColor: isDark ? 'rgba(37,99,235,0.1)' : 'rgba(37,99,235,0.07)',
                      tension: 0.45, fill: true,
                      pointRadius: 4, pointBackgroundColor: '#2563EB',
                      pointBorderColor: isDark ? '#0f172a' : '#fff', pointBorderWidth: 2,
                    }],
                  }}
                  options={lineOpts()}
                />
              ) : <NoData label="No registrations in last 12 months" />}
            </Box>
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <ChartCard icon={BarChartIcon} title="Conversation Activity" subtitle="Monthly volume" delay={0.33}>
            <Box sx={{ height: 240 }}>
              {analytics?.activityOverTime?.length > 0 ? (
                <Bar
                  data={{
                    labels: analytics.activityOverTime.map(d => d.month),
                    datasets: [{
                      data: analytics.activityOverTime.map(d => d.conversations),
                      backgroundColor: 'rgba(37,99,235,0.8)',
                      borderRadius: 5, borderSkipped: false,
                    }],
                  }}
                  options={barOpts()}
                />
              ) : <NoData label="No conversations yet" />}
            </Box>
          </ChartCard>
        </Grid>
        <Grid item xs={12} sm={6}>
          <ChartCard icon={PieChartOutline} title="Feature Usage" subtitle="AI capabilities breakdown" delay={0.36}>
            <Box sx={{ height: 240 }}>
              {featureData.length > 0 ? (
                <Doughnut
                  data={{
                    labels: featureData.map(f => cleanFeature(f.feature)),
                    datasets: [{ data: featureData.map(f => f.count), backgroundColor: P_BLUE, borderWidth: 0 }],
                  }}
                  options={doughnutOpts}
                />
              ) : <NoData label="No feature usage yet" />}
            </Box>
          </ChartCard>
        </Grid>
        <Grid item xs={12} sm={6}>
          <ChartCard icon={DescriptionOutlined} title="Document Types" subtitle="File type distribution" delay={0.39}>
            <Box sx={{ height: 240 }}>
              {docTypeData.length > 0 ? (
                <Doughnut
                  data={{
                    labels: docTypeData.map(d => d.type),
                    datasets: [{ data: docTypeData.map(d => d.count), backgroundColor: P_WARM, borderWidth: 0 }],
                  }}
                  options={doughnutOpts}
                />
              ) : <NoData label="No documents uploaded yet" />}
            </Box>
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── Top Users leaderboard ────────────────────────────────── */}
      {stats?.topUsers?.length > 0 && (
        <>
          <SectionLabel>Top Users</SectionLabel>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 2 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'warning.main' + '18' }}>
                    <EmojiEvents sx={{ color: 'warning.main', fontSize: 16 }} />
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700}>Most Active Users</Typography>
                </Stack>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 32, py: 0.75 }}>#</TableCell>
                      <TableCell sx={{ py: 0.75 }}>User</TableCell>
                      <TableCell align="right" sx={{ py: 0.75 }}>Conversations</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.topUsers.map((u, i) => (
                      <TableRow key={u._id||i} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="caption" fontWeight={800}
                            color={i===0?'warning.main':i===1?'text.secondary':'text.disabled'}>
                            {i + 1}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Stack direction="row" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 26, height: 26, fontSize: '0.7rem', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', fontWeight: 700 }}>
                              {(u.name||'?').charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="caption" fontWeight={600} display="block">{u.name||'—'}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{u.email}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1 }}>
                          <Chip size="small" label={u.conversationCount} color="primary" variant="outlined" sx={{ height: 18, fontWeight: 700 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* ── User Management ──────────────────────────────────────── */}
      <SectionLabel>User Management</SectionLabel>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between" gap={1.5} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>All Users</Typography>
                <Typography variant="caption" color="text.secondary">{filteredUsers.length} of {users.length} users</Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} flexWrap="wrap">
                <TextField size="small" placeholder="Search users…" value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} sx={{ minWidth: 180 }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 15, color: 'text.secondary' }} /></InputAdornment> } }} />
                <Select size="small" value={filterRole} onChange={(e) => setFilterRole(e.target.value)} displayEmpty sx={{ minWidth: 110 }}>
                  <MenuItem value="">All Roles</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
                <Select size="small" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} displayEmpty sx={{ minWidth: 120 }}>
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Blocked</MenuItem>
                </Select>
              </Stack>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={rows} columns={columns}
                autoHeight disableRowSelectionOnClick
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                getRowHeight={() => 60}
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
                  '& .MuiDataGrid-columnHeader:focus': { outline: 'none' },
                  '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
                  '& .MuiDataGrid-footerContainer': { borderTop: '1px solid', borderColor: 'divider' },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};

export default AdminDashboard;
