/**
 * Admin Dashboard Page
 * Statistics and user management — fully themed, light/dark aware.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI, analyticsAPI } from '../utils/api';
import {
  Users, MessageSquare, FileText, Activity,
  Shield, LogOut, Home, Search,
  Ban, CheckCircle, Trash2, UserCog,
  Download, TrendingUp, BarChart3,
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

/* ---- Stat Card ---- */
const StatCard = ({ icon: Icon, iconBg, iconColor, value, label, badge }) => (
  <div className="stat-card">
    <div className="flex items-center justify-between mb-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      {badge && (
        <span className="text-xs font-medium" style={{ color: 'var(--color-success-text)' }}>
          {badge}
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
      {value ?? 0}
    </h3>
    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
      {label}
    </p>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { isDark } = useTheme();

  // Resolved chart axis/legend colors
  const chartColors = {
    textMuted:     isDark ? '#64748b' : '#94a3b8',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    border:        isDark ? '#334155' : '#e2e8f0',
  };

  const [stats, setStats]           = useState(null);
  const [analytics, setAnalytics]   = useState(null);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, analyticsRes] = await Promise.all([
        adminAPI.getStatistics(),
        adminAPI.getUsers({ page: 1, limit: 100 }),
        analyticsAPI.getAdminAnalytics(),
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data.users);
      setAnalytics(analyticsRes.data.data);
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
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin-analytics-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Analytics exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export analytics');
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await adminAPI.toggleUserStatus(userId, !currentStatus);
      toast.success(`User ${!currentStatus ? 'activated' : 'blocked'} successfully`);
      fetchData();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchData();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await adminAPI.updateUserRole(userId, newRole);
      toast.success('User role updated');
      fetchData();
    } catch {
      toast.error('Failed to update user role');
    }
  };

  const filteredUsers = (users || []).filter((u) => {
    if (!u) return false;
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole   = !filterRole   || u.role === filterRole;
    const matchesStatus = filterStatus === '' || (u.isActive !== undefined && u.isActive.toString() === filterStatus);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const selectStyle = {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--color-border-input)',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--color-bg-input)',
    color: 'var(--color-text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
    cursor: 'pointer',
  };

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-page)' }}
      >
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-page)', transition: 'background-color 0.25s ease' }}>

      {/* ---- Header ---- */}
      <header className="glass sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Admin Dashboard
                </h1>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Manage users &amp; monitor system
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="btn-ghost flex items-center gap-1.5 text-sm"
                title="Export as JSON"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">JSON</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="btn-ghost flex items-center gap-1.5 text-sm"
                title="Export as CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <ThemeToggle />
              <button
                onClick={() => navigate('/')}
                className="btn-ghost flex items-center gap-1.5 text-sm"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Chat</span>
              </button>
              <button
                onClick={async () => { await logout(); navigate('/login'); }}
                className="btn-danger flex items-center gap-1.5 text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ---- Stats Grid ---- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <StatCard
            icon={Users}
            iconBg="var(--color-info-bg)"
            iconColor="var(--color-info-text)"
            value={stats?.overview?.totalUsers}
            label="Total Users"
            badge={`+${stats?.overview?.recentRegistrations ?? 0} this month`}
          />
          <StatCard
            icon={Activity}
            iconBg="var(--color-success-bg)"
            iconColor="var(--color-success-text)"
            value={stats?.overview?.activeUsers}
            label="Active Users"
            badge={`${stats?.overview?.activeUsersLastWeek ?? 0} this week`}
          />
          <StatCard
            icon={MessageSquare}
            iconBg="var(--color-info-bg)"
            iconColor="var(--color-primary-600, #2563eb)"
            value={stats?.overview?.totalConversations}
            label="Total Conversations"
          />
          <StatCard
            icon={FileText}
            iconBg="var(--color-warning-bg)"
            iconColor="var(--color-warning-text)"
            value={stats?.overview?.totalDocuments}
            label="Documents Processed"
          />
        </div>

        {/* ---- Analytics Charts ---- */}
        {showCharts && analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* User Growth Chart */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-primary-600)' }} />
                  <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    User Growth
                  </h2>
                </div>
                <button
                  onClick={() => setShowCharts(false)}
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Hide Charts
                </button>
              </div>
              <div style={{ height: '280px' }}>
                {analytics.userGrowth?.length > 0 ? (
                  <Line
                    data={{
                      labels: analytics.userGrowth.map(d => d.month),
                      datasets: [
                        {
                          label: 'New Users',
                          data: analytics.userGrowth.map(d => d.users),
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          tension: 0.4,
                          fill: true,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: chartColors.textMuted },
                          grid: { color: chartColors.border },
                        },
                        x: {
                          ticks: { color: chartColors.textMuted },
                          grid: { color: chartColors.border },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p style={{ color: 'var(--color-text-muted)' }}>No data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Over Time */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5" style={{ color: 'var(--color-primary-600)' }} />
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Activity Over Time
                </h2>
              </div>
              <div style={{ height: '280px' }}>
                {analytics.activityOverTime?.length > 0 ? (
                  <Bar
                    data={{
                      labels: analytics.activityOverTime.map(d => d.month),
                      datasets: [
                        {
                          label: 'Conversations',
                          data: analytics.activityOverTime.map(d => d.conversations),
                          backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: chartColors.textMuted },
                          grid: { color: chartColors.border },
                        },
                        x: {
                          ticks: { color: chartColors.textMuted },
                          grid: { color: chartColors.border },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p style={{ color: 'var(--color-text-muted)' }}>No data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Feature Usage Distribution */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5" style={{ color: 'var(--color-primary-600)' }} />
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Feature Usage
                </h2>
              </div>
              <div style={{ height: '280px' }}>
                {analytics.featureUsage?.length > 0 ? (
                  <Doughnut
                    data={{
                      labels: analytics.featureUsage.map(f => f.feature),
                      datasets: [
                        {
                          data: analytics.featureUsage.map(f => f.count),
                          backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                          ],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { color: chartColors.textSecondary },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p style={{ color: 'var(--color-text-muted)' }}>No data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Document Types */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5" style={{ color: 'var(--color-primary-600)' }} />
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Document Types
                </h2>
              </div>
              <div style={{ height: '280px' }}>
                {analytics.documentTypes?.length > 0 ? (
                  <Doughnut
                    data={{
                      labels: analytics.documentTypes.map(d => d.type),
                      datasets: [
                        {
                          data: analytics.documentTypes.map(d => d.count),
                          backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                          ],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { color: chartColors.textSecondary },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p style={{ color: 'var(--color-text-muted)' }}>No data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!showCharts && (
          <div className="text-center mb-8">
            <button
              onClick={() => setShowCharts(true)}
              className="btn-ghost flex items-center gap-2 mx-auto"
            >
              <BarChart3 className="w-4 h-4" />
              Show Analytics Charts
            </button>
          </div>
        )}

        {/* ---- User Management Card ---- */}
        <div className="card p-0 overflow-hidden">

          {/* Card Header */}
          <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              User Management
            </h2>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Search users…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-9"
                />
              </div>

              {/* Role filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                style={selectStyle}
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={selectStyle}
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Blocked</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                  {['User', 'Role', 'Status', 'Joined', 'Actions'].map((col, i) => (
                    <th
                      key={col}
                      className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wider border-b ${i === 4 ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, uIdx) => (
                  <tr
                    key={u?._id || uIdx}
                    className="border-b transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* User */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {(u?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{u?.name || 'Unnamed'}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{u?.email || ''}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2.5 py-0.5 text-xs rounded-full font-medium"
                        style={
                          u?.role === 'admin'
                            ? { backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info-text)' }
                            : { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }
                        }
                      >
                        {u?.role || 'user'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2.5 py-0.5 text-xs rounded-full font-medium"
                        style={
                          u?.isActive
                            ? { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success-text)' }
                            : { backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error-text)' }
                        }
                      >
                        {u?.isActive ? 'Active' : 'Blocked'}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {u?.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u?._id && u._id !== user?._id && (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle status */}
                          <button
                            onClick={() => handleToggleStatus(u._id, u.isActive)}
                            className="icon-btn"
                            title={u.isActive ? 'Block user' : 'Activate user'}
                            style={{ color: u.isActive ? '#dc2626' : '#16a34a' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = u.isActive ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            {u.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>

                          {/* Change role */}
                          <button
                            onClick={() => handleUpdateRole(u._id, u.role === 'admin' ? 'user' : 'admin')}
                            className="icon-btn"
                            title="Change role"
                            style={{ color: '#2563eb' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <UserCog className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(u._id)}
                            className="icon-btn"
                            title="Delete user"
                            style={{ color: '#dc2626' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                <p style={{ color: 'var(--color-text-secondary)' }}>No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
