import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button, IconButton, Tooltip,
  TextField, InputAdornment, Stack, alpha, Switch, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, LinearProgress,
} from '@mui/material';
import {
  People, Assessment, Memory, Shield, Search, MoreVert,
  Block, CheckCircle, Delete, AdminPanelSettings, Refresh, AutoAwesome,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { adminAPI } from '../utils/api';
import { DashboardSkeleton, TableSkeleton } from '../components/ui/LoadingSkeleton';
import toast from 'react-hot-toast';

const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(color || '#2563EB', 0.1) }}>
          <Icon sx={{ fontSize: 20, color: color || '#2563EB' }} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value ?? '—'}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>{label}</Typography>
          {subtitle && <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', display: 'block' }}>{subtitle}</Typography>}
        </Box>
      </Box>
    </Paper>
  </motion.div>
);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getStatistics(),
        adminAPI.getUsers({ limit: 50 }),
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data?.users || usersRes.data.data || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const statCards = [
    { icon: People, label: 'Total Users', value: stats?.totalUsers ?? 0, color: '#2563EB', subtitle: `${stats?.activeUsers ?? 0} active` },
    { icon: Assessment, label: 'Total Conversations', value: stats?.totalConversations ?? 0, color: '#16A34A' },
    { icon: Memory, label: 'System Uptime', value: stats?.uptime ?? '99.9%', color: '#7C3AED', subtitle: 'Last 30 days' },
    { icon: Shield, label: 'Active Sessions', value: stats?.activeSessions ?? 0, color: '#F59E0B' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <AdminPanelSettings sx={{ fontSize: 22, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.03em' }}>Admin</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">System management and user administration</Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={fetchData} sx={{ borderRadius: 2 }}>
          Refresh
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s) => <Grid item xs={6} md={3} key={s.label}><StatCard {...s} /></Grid>)}
      </Grid>

      {/* Users table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>Users ({users.length})</Typography>
          <TextField
            size="small"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment>,
              sx: { fontSize: '0.8125rem', height: 34, width: 220 },
            }}
          />
        </Box>

        {filteredUsers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <AutoAwesome sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">{searchQuery ? 'No users match your search' : 'No users found'}</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
              <Box component="thead">
                <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#0A0D14', 0.02) }}>
                  {['User', 'Role', 'Status', 'Conversations', 'Joined', 'Actions'].map((h) => (
                    <Box key={h} component="th" sx={{ textAlign: 'left', px: 2.5, py: 1.5, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {loading ? <TableSkeleton /> : filteredUsers.map((user, i) => (
                  <Box
                    key={user._id}
                    component="tr"
                    sx={{
                      borderBottom: '1px solid', borderColor: 'divider',
                      transition: 'background 0.12s',
                      '&:hover': { bgcolor: alpha('#2563EB', 0.02) },
                      bgcolor: i % 2 === 0 ? 'transparent' : alpha('#0A0D14', 0.015),
                    }}
                  >
                    <Box component="td" sx={{ px: 2.5, py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 30, height: 30, fontSize: '0.75rem', bgcolor: user.role === 'admin' ? 'error.main' : 'primary.main' }}>
                          {user.name?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>{user.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box component="td" sx={{ px: 2.5, py: 1.5 }}>
                      <Chip
                        size="small"
                        label={user.role}
                        color={user.role === 'admin' ? 'error' : user.role === 'analyst' ? 'warning' : 'default'}
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600, textTransform: 'capitalize' }}
                      />
                    </Box>
                    <Box component="td" sx={{ px: 2.5, py: 1.5 }}>
                      <Chip
                        size="small"
                        icon={user.isActive ? <CheckCircle sx={{ fontSize: 12 }} /> : <Block sx={{ fontSize: 12 }} />}
                        label={user.isActive ? 'Active' : 'Blocked'}
                        color={user.isActive ? 'success' : 'error'}
                        sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600 }}
                      />
                    </Box>
                    <Box component="td" sx={{ px: 2.5, py: 1.5 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{user.conversationCount ?? 0}</Typography>
                    </Box>
                    <Box component="td" sx={{ px: 2.5, py: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </Typography>
                    </Box>
                    <Box component="td" sx={{ px: 2.5, py: 1.5 }}>
                      <Stack direction="row" gap={0.25}>
                        <Tooltip title="View details">
                          <IconButton size="small" onClick={() => { setSelectedUser(user); setDetailOpen(true); }} sx={{ width: 28, height: 28 }}>
                            <MoreVert sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.isActive ? 'Block user' : 'Activate user'}>
                          <IconButton size="small" onClick={() => handleToggleStatus(user._id, user.isActive)} sx={{ width: 28, height: 28 }}>
                            {user.isActive ? <Block sx={{ fontSize: 15, color: 'error.main' }} /> : <CheckCircle sx={{ fontSize: 15, color: 'success.main' }} />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Change role">
                          <IconButton size="small" onClick={() => { setSelectedUser(user); setNewRole(user.role); setRoleDialogOpen(true); }} sx={{ width: 28, height: 28 }}>
                            <Shield sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete user">
                          <IconButton size="small" onClick={() => handleDeleteUser(user._id)} sx={{ width: 28, height: 28 }}>
                            <Delete sx={{ fontSize: 15, color: 'error.main' }} />
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

      {/* User detail dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        {selectedUser && (
          <>
            <DialogTitle>User Details</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ width: 48, height: 48, fontSize: '1.125rem', bgcolor: 'primary.main' }}>
                  {selectedUser.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>{selectedUser.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
                </Box>
              </Box>
              <Grid container spacing={2}>
                {[
                  { label: 'Role', value: selectedUser.role },
                  { label: 'Status', value: selectedUser.isActive ? 'Active' : 'Blocked' },
                  { label: 'Joined', value: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '—' },
                  { label: 'Conversations', value: selectedUser.conversationCount ?? 0 },
                ].map((f) => (
                  <Grid item xs={6} key={f.label}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.675rem', fontWeight: 600 }}>{f.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{f.value}</Typography>
                  </Grid>
                ))}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailOpen(false)} variant="outlined" size="small">Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Role change dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Role</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Update role for {selectedUser?.name}
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            label="Role"
          >
            {['user', 'analyst', 'admin'].map((r) => (
              <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)} size="small">Cancel</Button>
          <Button onClick={handleRoleChange} variant="contained" size="small">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
