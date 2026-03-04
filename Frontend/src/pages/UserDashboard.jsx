/**
 * User Dashboard Page
 * Personal analytics and usage statistics
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../utils/api';
import {
  MessageSquare, FileText, TrendingUp, Home,
  Download, BarChart3, Activity, Calendar,
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

const StatCard = ({ icon: Icon, iconBg, iconColor, value, label }) => (
  <div className="stat-card">
    <div className="flex items-center justify-between mb-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
    </div>
    <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
      {value ?? 0}
    </h3>
    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
      {label}
    </p>
  </div>
);

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Resolved chart colors based on current theme
  const chartColors = {
    textMuted:     isDark ? '#64748b' : '#94a3b8',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    border:        isDark ? '#334155' : '#e2e8f0',
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getUserAnalytics();
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
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
      link.download = `my-analytics-${Date.now()}.${format}`;
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

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-page)' }}
      >
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const usageChartData = {
    labels: analytics?.usageOverTime?.map(d => d.month) || [],
    datasets: [
      {
        label: 'Conversations',
        data: analytics?.usageOverTime?.map(d => d.conversations) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const featureChartData = {
    labels: analytics?.featureUsage?.map(f => f.feature) || [],
    datasets: [
      {
        label: 'Usage Count',
        data: analytics?.featureUsage?.map(f => f.count) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: chartColors.textSecondary,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: chartColors.textMuted,
        },
        grid: {
          color: chartColors.border,
        },
      },
      x: {
        ticks: {
          color: chartColors.textMuted,
        },
        grid: {
          color: chartColors.border,
        },
      },
    },
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-page)' }}>
      {/* Header */}
      <header className="glass sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  My Dashboard
                </h1>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Your usage statistics
                </p>
              </div>
            </div>

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
                className="btn-primary flex items-center gap-1.5 text-sm"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Chat</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <StatCard
            icon={MessageSquare}
            iconBg="var(--color-info-bg)"
            iconColor="var(--color-info-text)"
            value={analytics?.overview?.totalConversations}
            label="Total Conversations"
          />
          <StatCard
            icon={Activity}
            iconBg="var(--color-success-bg)"
            iconColor="var(--color-success-text)"
            value={analytics?.overview?.totalMessages}
            label="Messages Sent"
          />
          <StatCard
            icon={FileText}
            iconBg="var(--color-warning-bg)"
            iconColor="var(--color-warning-text)"
            value={analytics?.overview?.totalDocuments}
            label="Documents Analyzed"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usage Over Time */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-primary-600)' }} />
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Usage Over Time
              </h2>
            </div>
            <div style={{ height: '300px' }}>
              {analytics?.usageOverTime?.length > 0 ? (
                <Line data={usageChartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p style={{ color: 'var(--color-text-muted)' }}>No data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Feature Usage */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" style={{ color: 'var(--color-primary-600)' }} />
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Feature Usage
              </h2>
            </div>
            <div style={{ height: '300px' }}>
              {analytics?.featureUsage?.length > 0 ? (
                <Bar data={featureChartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p style={{ color: 'var(--color-text-muted)' }}>No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
