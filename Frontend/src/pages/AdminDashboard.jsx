import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button, IconButton, Tooltip,
  TextField, InputAdornment, Stack, alpha, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
  PeopleOutline, Assessment, Memory, Shield, Search, MoreVert,
  Block, CheckCircle, Delete, Refresh, AutoAwesomeOutlined,
  AdminPanelSettingsOutlined
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { adminAPI } from '../utils/api';
import { DashboardSkeleton, TableSkeleton } from '../components/ui/LoadingSkeleton';
import toast from 'react-hot-toast';

const StatCard = ({ icon: Icon, label, value, color, subtitle, delay }) => (
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
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h3" fontWeight={800} noWrap sx={{ mb: 0.5, letterSpacing: '-0.03em', color: 'text.primary', fontSize: { xs: '1.75rem', md: '3rem' } }}>
            {value ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600} noWrap sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
            {label}
          </Typography>
          {subtitle && (
            <Typography variant="caption" noWrap sx={{ color: color, fontWeight: 700, mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  </motion.div>
);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes, healthRes] = await Promise.all([
        adminAPI.getStatistics(),
        adminAPI.getUsers({ limit: 50 }),
        adminAPI.getHealth().catch(() => ({ data: { data: null } }))
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data?.users || usersRes.data.data || []);
      setHealth(healthRes.data.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await adminAPI.toggleUserStatus(userId, !currentStatus);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isActive: !currentStatus } : u));
      toast.success(`User ${currentStatus ? 'blocked' : 'activated'}`);
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;
    try {
      await adminAPI.updateUserRole(selectedUser._id, newRole);
      setUsers((prev) => prev.map((u) => u._id === selectedUser._id ? { ...u, role: newRole } : u));
      setSelectedUser((prev) => ({ ...prev, role: newRole }));
      toast.success('Role updated');
    } catch (err) {
      toast.error('Failed to update role');
    }
    setRoleDialogOpen(false);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Permanently delete this user?')) return;
    try {
      await adminAPI.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast.success('User deleted');
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <DashboardSkeleton />;

  const formatUptime = (seconds) => {
    if (!seconds) return '99.9%';
    const days = Math.floor(seconds / (3600 * 24));
    if (days > 0) return `${days}d uptime`;
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    if (hours > 0) return `${hours}h uptime`;
    const mins = Math.floor((seconds % 3600) / 60);
    return `${mins}m uptime`;
  };

  const statCards = [
    { icon: PeopleOutline, label: 'Total Users', value: stats?.overview?.totalUsers ?? 0, color: '#2563EB', subtitle: `${stats?.overview?.activeUsers ?? 0} active`, delay: 0.1 },
    { icon: Assessment, label: 'Conversations', value: stats?.overview?.totalConversations ?? 0, color: '#16A34A', delay: 0.2 },
    { icon: Memory, label: 'System Uptime', value: formatUptime(health?.uptime), color: '#7C3AED', subtitle: health?.database === 'connected' ? 'DB Connected' : 'DB Status Unknown', delay: 0.3 },
    { icon: Shield, label: 'Analysis Runs', value: stats?.overview?.totalDocuments ?? 0, color: '#F59E0B', delay: 0.4 },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4, lg: 5 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 1 }}>
            Admin Control Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage users, monitor system health, and configure access.
          </Typography>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {statCards.map((s) => <Grid size={{ xs: 12, sm: 6, md: 3 }} key={s.label}><StatCard {...s} /></Grid>)}
      </Grid>

      {/* Users table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
        <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'var(--color-bg-elevated)', backdropFilter: 'blur(16px)' }}>
          <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', bgcolor: alpha('#94A3B8', 0.02) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
              <AdminPanelSettingsOutlined sx={{ color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={700}>User Directory</Typography>
              <Chip size="small" label={`${users.length} Users`} sx={{ ml: 1, bgcolor: alpha('#2563EB', 0.1), color: '#2563EB', fontWeight: 700 }} />
            </Box>
            <TextField
              size="small"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment>,
                sx: { fontSize: '0.875rem', borderRadius: 2, width: { xs: '100%', sm: 280 }, bgcolor: 'rgba(0,0,0,0.2)' },
              }}
            />
          </Box>

          {filteredUsers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <AutoAwesomeOutlined sx={{ fontSize: 40, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>{searchQuery ? 'No matches found' : 'No users found'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery ? 'Try adjusting your search terms.' : 'The system currently has no registered users.'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="thead">
                  <Box component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(0,0,0,0.2)' }}>
                    {['User', 'Role', 'Status', 'Conversations', 'Joined', 'Actions'].map((h) => (
                      <Box key={h} component="th" sx={{ textAlign: 'left', px: 3, py: 2, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {filteredUsers.map((user, i) => (
                    <Box
                      key={user._id}
                      component="tr"
                      sx={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.2s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                      }}
                    >
                      <Box component="td" sx={{ px: 3, py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 36, height: 36, fontSize: '1rem', fontWeight: 700, bgcolor: user.role === 'admin' ? 'error.main' : user.role === 'analyst' ? 'warning.main' : 'primary.main' }}>
                            {user.name?.charAt(0)?.toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.875rem' }}>{user.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Box component="td" sx={{ px: 3, py: 2 }}>
                        <Chip
                          size="small"
                          label={user.role}
                          color={user.role === 'admin' ? 'error' : user.role === 'analyst' ? 'warning' : 'primary'}
                          sx={{ height: 24, fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize', borderRadius: 1.5 }}
                        />
                      </Box>
                      <Box component="td" sx={{ px: 3, py: 2 }}>
                        <Chip
                          size="small"
                          icon={user.isActive ? <CheckCircle sx={{ fontSize: 14 }} /> : <Block sx={{ fontSize: 14 }} />}
                          label={user.isActive ? 'Active' : 'Blocked'}
                          color={user.isActive ? 'success' : 'error'}
                          variant="outlined"
                          sx={{ height: 24, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1.5 }}
                        />
                      </Box>
                      <Box component="td" sx={{ px: 3, py: 2 }}>
                        <Typography variant="body2" fontWeight={600}>{user.conversationCount ?? 0}</Typography>
                      </Box>
                      <Box component="td" sx={{ px: 3, py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </Typography>
                      </Box>
                      <Box component="td" sx={{ px: 3, py: 2 }}>
                        <Stack direction="row" gap={0.5}>
                          <Tooltip title="View details">
                            <IconButton size="small" onClick={() => { setSelectedUser(user); setDetailOpen(true); }} sx={{ width: 32, height: 32, bgcolor: alpha('#94A3B8', 0.1), '&:hover': { bgcolor: alpha('#94A3B8', 0.2) } }}>
                              <MoreVert sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={user.isActive ? 'Block user' : 'Activate user'}>
                            <IconButton size="small" onClick={() => handleToggleStatus(user._id, user.isActive)} sx={{ width: 32, height: 32, bgcolor: alpha(user.isActive ? '#EF4444' : '#10B981', 0.1), '&:hover': { bgcolor: alpha(user.isActive ? '#EF4444' : '#10B981', 0.2) } }}>
                              {user.isActive ? <Block sx={{ fontSize: 16, color: 'error.main' }} /> : <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Change role">
                            <IconButton size="small" onClick={() => { setSelectedUser(user); setNewRole(user.role); setRoleDialogOpen(true); }} sx={{ width: 32, height: 32, bgcolor: alpha('#2563EB', 0.1), '&:hover': { bgcolor: alpha('#2563EB', 0.2) } }}>
                              <Shield sx={{ fontSize: 16, color: 'primary.main' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete user">
                            <IconButton size="small" onClick={() => handleDeleteUser(user._id)} sx={{ width: 32, height: 32, bgcolor: alpha('#EF4444', 0.1), '&:hover': { bgcolor: alpha('#EF4444', 0.2) } }}>
                              <Delete sx={{ fontSize: 16, color: 'error.main' }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      </motion.div>

      {/* User detail dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        {selectedUser && (
          <>
            <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>User Details</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4, p: 3, bgcolor: alpha('#94A3B8', 0.05), borderRadius: 3 }}>
                <Avatar sx={{ width: 64, height: 64, fontSize: '1.5rem', fontWeight: 700, bgcolor: selectedUser.role === 'admin' ? 'error.main' : selectedUser.role === 'analyst' ? 'warning.main' : 'primary.main' }}>
                  {selectedUser.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>{selectedUser.name}</Typography>
                  <Typography variant="body1" color="text.secondary">{selectedUser.email}</Typography>
                </Box>
              </Box>
              <Grid container spacing={3} sx={{ px: 1 }}>
                {[
                  { label: 'Role', value: selectedUser.role, color: 'primary.main' },
                  { label: 'Status', value: selectedUser.isActive ? 'Active' : 'Blocked', color: selectedUser.isActive ? 'success.main' : 'error.main' },
                  { label: 'Joined', value: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '—' },
                  { label: 'Conversations', value: selectedUser.conversationCount ?? 0 },
                ].map((f) => (
                  <Grid item xs={6} key={f.label}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: f.color || 'text.primary', textTransform: f.label === 'Role' ? 'capitalize' : 'none' }}>{f.value}</Typography>
                  </Grid>
                ))}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ pt: 3, pb: 2, px: 3 }}>
              <Button onClick={() => setDetailOpen(false)} variant="contained" size="large" fullWidth sx={{ borderRadius: 2, fontWeight: 700 }}>Close Details</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Role change dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>Change Access Role</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select a new system role for <strong>{selectedUser?.name}</strong>.
          </Typography>
          <TextField
            select
            fullWidth
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            label="System Role"
            InputProps={{ sx: { borderRadius: 2 } }}
          >
            {['user', 'analyst', 'admin'].map((r) => (
              <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize', fontWeight: 600, py: 1.5 }}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ pt: 2, pb: 2, px: 3, gap: 1 }}>
          <Button onClick={() => setRoleDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2, flex: 1, fontWeight: 700 }}>Cancel</Button>
          <Button onClick={handleRoleChange} variant="contained" sx={{ borderRadius: 2, flex: 1, fontWeight: 700, boxShadow: 'none' }}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
