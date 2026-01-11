/**
 * Analytics Dashboard
 * Shows usage statistics and insights
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageSquare, 
  FileText, 
  Clock, 
  TrendingUp,
  Calendar,
  BarChart3
} from 'lucide-react';
import { analyticsAPI } from '../utils/api';

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getStats();
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-2 text-slate-400 hover:text-blue-400 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Chat</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-slate-400 mt-1">Your usage statistics and insights</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Conversations */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full">
                Total
              </span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {analytics?.totalConversations || 0}
            </h3>
            <p className="text-sm text-slate-400">Conversations</p>
          </div>

          {/* Total Messages */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 hover:border-green-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-xs font-semibold text-green-400 bg-green-500/20 px-3 py-1 rounded-full">
                Messages
              </span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {analytics?.totalMessages || 0}
            </h3>
            <p className="text-sm text-slate-400">Total Messages</p>
          </div>

          {/* Total Documents */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 hover:border-purple-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs font-semibold text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full">
                Files
              </span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {analytics?.totalDocuments || 0}
            </h3>
            <p className="text-sm text-slate-400">Documents Uploaded</p>
          </div>

          {/* Avg Response Time */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 hover:border-orange-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-xs font-semibold text-orange-400 bg-orange-500/20 px-3 py-1 rounded-full">
                Speed
              </span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {analytics?.avgResponseTime || '2.3'}s
            </h3>
            <p className="text-sm text-slate-400">Avg Response Time</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Active Conversations */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Most Active Conversations</h2>
            </div>
            <div className="space-y-3">
              {analytics?.topConversations?.length > 0 ? (
                analytics.topConversations.map((conv, index) => (
                  <div
                    key={conv._id}
                    className="flex items-center justify-between p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center font-bold text-blue-400">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{conv.title}</p>
                        <p className="text-xs text-slate-400">{conv.messageCount} messages</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">No data available</p>
              )}
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Activity Summary</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div>
                  <p className="text-sm font-semibold text-white">Today</p>
                  <p className="text-xs text-slate-400">Messages sent</p>
                </div>
                <span className="text-2xl font-bold text-blue-400">
                  {analytics?.todayMessages || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <div>
                  <p className="text-sm font-semibold text-white">This Week</p>
                  <p className="text-xs text-slate-400">Messages sent</p>
                </div>
                <span className="text-2xl font-bold text-green-400">
                  {analytics?.weekMessages || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <div>
                  <p className="text-sm font-semibold text-white">This Month</p>
                  <p className="text-xs text-slate-400">Messages sent</p>
                </div>
                <span className="text-2xl font-bold text-purple-400">
                  {analytics?.monthMessages || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
