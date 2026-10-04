import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Stack, alpha, Chip, useTheme,
  Button, ToggleButton, ToggleButtonGroup, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import {
  Assessment, PeopleOutline, AutoAwesomeOutlined, ShowChart, ForumOutlined,
  DescriptionOutlined, TrendingUp, CategoryOutlined, Timeline, Insights, InsertDriveFileOutlined,
  Download, NotificationsActive, WarningAmber, InfoOutlined, ErrorOutline
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { analyticsAPI, enterpriseAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import { useAuth } from '../contexts/AuthContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, Brush,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart, Line
} from 'recharts';

const COLORS = ['#2563EB', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#14B8A6'];

const StatCard = ({ icon: Icon, label, value, color, delay, trend }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay, ease: "easeOut" }}>
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        borderRadius: 4, 
        height: '100%', 
        bgcolor: 'var(--color-bg-elevated)',
        backdropFilter: 'blur(16px)',
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
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', gap: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h3" fontWeight={800} noWrap sx={{ mb: 0.5, letterSpacing: '-0.03em', color: 'text.primary', fontSize: { xs: '1.75rem', md: '3rem' } }}>
              {value ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={600} noWrap sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
              {label}
            </Typography>
          </Box>
          {trend && (
            <Chip 
              size="small" 
              label={trend > 0 ? `+${trend}%` : `${trend}%`} 
              icon={<TrendingUp sx={{ fontSize: 14, transform: trend < 0 ? 'rotate(180deg)' : 'none', color: trend > 0 ? '#10B981!important' : '#EF4444!important' }}/>} 
              sx={{ 
                bgcolor: alpha(trend > 0 ? '#10B981' : '#EF4444', 0.1), 
                color: trend > 0 ? '#10B981' : '#EF4444',
                fontWeight: 800, borderRadius: 1.5, px: 0.5
              }} 
            />
          )}
        </Box>
      </Box>
    </Paper>
  </motion.div>
);

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <Paper elevation={4} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'var(--color-bg-elevated)', backdropFilter: 'blur(20px)' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>{label}</Typography>
        <Typography variant="subtitle2" fontWeight={700} color="primary.main">
          {payload[0].value} {unit}
        </Typography>
      </Paper>
    );
  }
  return null;
};

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
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (loading) return <DashboardSkeleton />;

  const isExecutive = isAdmin && adminAnalytics;
  const isUser = !isAdmin && userAnalytics;

  const overview = userAnalytics?.overview;
  const featureUsage = adminAnalytics?.featureUsage || userAnalytics?.featureUsage || [];
  const activityData = adminAnalytics?.activityOverTime || userAnalytics?.usageOverTime || [];
  const userGrowth = adminAnalytics?.userGrowth || [];
  const docTypes = adminAnalytics?.documentTypes || [];

  // Merge activity and user growth for composed chart
  const mergedActivityGrowth = activityData.map(a => {
    const ug = userGrowth.find(u => u.month === a.month);
    return {
      month: a.month,
      conversations: a.conversations !== undefined ? a.conversations : a.count,
      users: ug ? ug.users : 0
    };
  });

  const pieData = featureUsage.map(f => ({ name: f.feature || 'Unknown', value: f.count }));

  const totalUsers = userGrowth.reduce((s, u) => s + (u.users || 0), 0);
  const totalConversations = activityData.reduce((s, a) => s + (a.conversations || 0), 0);
  const totalFeatureOps = featureUsage.reduce((s, f) => s + (f.count || 0), 0);

  return (
    <Box sx={{ p: { xs: 2, md: 4, lg: 5 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 5 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 1 }}>
            Executive Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Global metrics, user growth, and system usage analysis.
          </Typography>
        </Box>
      </Box>

      {/* KPIs */}
      {(isExecutive || isUser) && (
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {isExecutive && (
            <>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard icon={PeopleOutline} label="Total Users" value={totalUsers} color="#2563EB" trend={12.5} delay={0.1} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard icon={ForumOutlined} label="Conversations" value={totalConversations} color="#8B5CF6" trend={24.1} delay={0.2} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard icon={AutoAwesomeOutlined} label="Analysis Runs" value={totalFeatureOps} color="#10B981" trend={8.3} delay={0.3} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard icon={CategoryOutlined} label="Doc Types" value={docTypes.length || '—'} color="#F59E0B" trend={0} delay={0.4} />
              </Grid>
            </>
          )}
          {isUser && overview && (
            <>
              <Grid size={{ xs: 12, sm: 4 }}>
                <StatCard icon={ForumOutlined} label="Conversations" value={overview.totalConversations || 0} color="#2563EB" delay={0.1} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <StatCard icon={Assessment} label="Messages Sent" value={overview.totalMessages || 0} color="#8B5CF6" delay={0.2} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <StatCard icon={DescriptionOutlined} label="Documents" value={overview.totalDocuments || 0} color="#10B981" delay={0.3} />
              </Grid>
            </>
          )}
        </Grid>
      )}

      <Grid container spacing={4}>
        {/* Activity Over Time */}
        {activityData.length > 0 && (
          <Grid size={{ xs: 12, lg: 8 }}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'var(--color-bg-elevated)', backdropFilter: 'blur(16px)', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#2563EB', 0.1), color: '#2563EB' }}>
                    <Timeline fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>System Activity</Typography>
                </Box>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha('#94A3B8', 0.2)} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                    <ReTooltip content={<CustomTooltip unit={activityData[0]?.conversations !== undefined ? 'Conversations' : 'Actions'} />} />
                    <Area type="monotone" dataKey={activityData[0]?.conversations !== undefined ? 'conversations' : 'count'} stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorActivity)" />
                    <Brush dataKey="month" height={25} stroke={alpha('#2563EB', 0.5)} fill={alpha('#000', 0.2)} tickFormatter={() => ''} />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </motion.div>
          </Grid>
        )}

        {/* User Growth */}
        {userGrowth.length > 0 && (
          <Grid size={{ xs: 12, lg: 4 }}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
              <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'var(--color-bg-elevated)', backdropFilter: 'blur(16px)', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#10B981', 0.1), color: '#10B981' }}>
                    <TrendingUp fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>User Growth</Typography>
                </Box>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha('#94A3B8', 0.2)} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                    <ReTooltip content={<CustomTooltip unit="Users" />} />
                    <Bar dataKey="users" fill="#10B981" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </motion.div>
          </Grid>
        )}

        {/* Feature Usage */}
        {featureUsage.length > 0 && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.6 }}>
              <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'var(--color-bg-elevated)', backdropFilter: 'blur(16px)', height: '100%' }}>
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
                            style={{ height: '100%', backgroundColor: COLORS[i % COLORS.length], borderRadius: 12 }}
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

        {/* Document Types */}
        {docTypes.length > 0 && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.7 }}>
              <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'var(--color-bg-elevated)', backdropFilter: 'blur(16px)', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B' }}>
                    <InsertDriveFileOutlined fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>Document Types</Typography>
                </Box>
                <Stack spacing={3}>
                  {docTypes.map((d, i) => {
                    const maxCount = Math.max(...docTypes.map(x => x.count));
                    const percentage = Math.min((d.count / maxCount) * 100, 100);
                    const color = COLORS[(i + 4) % COLORS.length];
                    
                    return (
                      <Box key={i}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" fontWeight={600} color='text.secondary' sx={{ textTransform: 'capitalize' }}>
                            {d.type || 'Unknown'}
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>{d.count}</Typography>
                        </Box>
                        <Box sx={{ width: '100%', height: 6, bgcolor: alpha('#94A3B8', 0.15), borderRadius: 3, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: 0.7 + (i * 0.1), ease: "easeOut" }}
                            style={{ height: '100%', backgroundColor: color, borderRadius: 12 }}
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
        {/* Feature Distribution (Donut Chart) */}
        {pieData.length > 0 && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.75 }}>
              <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'var(--color-bg-elevated)', backdropFilter: 'blur(16px)', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#EC4899', 0.1), color: '#EC4899' }}>
                    <CategoryOutlined fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>Feature Distribution (Visual)</Typography>
                </Box>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip content={<CustomTooltip unit="uses" />} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', mt: 2 }}>
                  {pieData.map((entry, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[index % COLORS.length] }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                        {entry.name.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </motion.div>
          </Grid>
        )}

        {/* Activity vs Growth (Composed Chart) */}
        {mergedActivityGrowth.length > 0 && isExecutive && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.85 }}>
              <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'var(--color-bg-elevated)', backdropFilter: 'blur(16px)', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#14B8A6', 0.1), color: '#14B8A6' }}>
                    <ShowChart fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>Activity vs Growth</Typography>
                </Box>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={mergedActivityGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha('#94A3B8', 0.2)} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <ReTooltip content={<CustomTooltip unit="" />} />
                    <Bar yAxisId="left" dataKey="conversations" name="Conversations" fill={alpha('#14B8A6', 0.2)} radius={[4, 4, 0, 0]} barSize={20} />
                    <Line yAxisId="right" type="monotone" dataKey="users" name="Users" stroke="#14B8A6" strokeWidth={3} dot={{ r: 4, fill: '#14B8A6', strokeWidth: 2, stroke: 'var(--color-bg-elevated)' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Paper>
            </motion.div>
          </Grid>
        )}
      </Grid>

      {/* Available Analysis Modes */}
      {analysisTypes.length > 0 && (
        <Box sx={{ mt: 5 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'var(--color-bg-elevated)', backdropFilter: 'blur(16px)' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Available Analysis Modes</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {analysisTypes.map((t, i) => (
                  <Chip 
                    key={t} 
                    label={(t || '').replace(/_/g, ' ')} 
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.8125rem', 
                      fontWeight: 600, 
                      borderRadius: 2,
                      borderWidth: 2,
                      px: 1,
                      py: 2,
                      borderColor: alpha(COLORS[i % COLORS.length], 0.3),
                      color: COLORS[i % COLORS.length],
                      bgcolor: alpha(COLORS[i % COLORS.length], 0.05)
                    }} 
                  />
                ))}
              </Box>
            </Paper>
          </motion.div>
        </Box>
      )}



      {/* Empty state */}
      {!isExecutive && !isUser && !featureUsage.length && !activityData.length && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Paper elevation={0} sx={{ textAlign: 'center', py: 10, px: 3, borderRadius: 4, border: '1px dashed rgba(255,255,255,0.1)', bgcolor: 'var(--color-bg-elevated)', backdropFilter: 'blur(16px)' }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: alpha('#2563EB', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              <TrendingUp sx={{ fontSize: 40, color: '#2563EB' }} />
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

export default ExecutiveDashboard;
