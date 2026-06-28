/**
 * Bookmarks Page
 * Saved analyses and important insights
 */

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, IconButton, Chip, Button, TextField,
} from '@mui/material';
import { Delete, ArrowBack, Search } from '@mui/icons-material';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { enterpriseAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';

const BookmarksPage = () => {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchBookmarks = async () => {
    try {
      const res = await enterpriseAPI.getBookmarks();
      setBookmarks(res.data.data || []);
    } catch {
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookmarks(); }, []);

  const handleDelete = async (id) => {
    try {
      await enterpriseAPI.deleteBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b._id !== id));
      toast.success('Bookmark deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = bookmarks.filter(
    (b) => !search || 
      (b?.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (b?.content || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <DashboardSkeleton />;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/')}>Back</Button>
        <Typography variant="h5" fontWeight={700}>Bookmarks</Typography>
      </Box>

      <TextField
        size="small"
        fullWidth
        placeholder="Search bookmarks..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
        sx={{ mb: 3 }}
      />

      {filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No bookmarks yet. Save analyses from the Enterprise panel.</Typography>
        </Paper>
      ) : (
        filtered.map((bm, idx) => (
          <motion.div key={bm?._id || idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
            <Paper sx={{ p: 2.5, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>{bm?.title || 'Untitled Bookmark'}</Typography>
                  {bm?.analysisType && typeof bm.analysisType === 'string' && (
                    <Chip label={bm.analysisType.replace(/_/g, ' ')} size="small" sx={{ mt: 0.5 }} />
                  )}
                </Box>
                {bm?._id && (
                  <IconButton size="small" color="error" onClick={() => handleDelete(bm._id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                )}
              </Box>
              <div className="prose-chat" style={{ maxHeight: 200, overflow: 'auto' }}>
                <ReactMarkdown>
                  {((bm?.content || '').slice(0, 500)) + ((bm?.content || '').length > 500 ? '...' : '')}
                </ReactMarkdown>
              </div>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {bm?.createdAt ? new Date(bm.createdAt).toLocaleDateString() : ''}
              </Typography>
            </Paper>
          </motion.div>
        ))
      )}
    </Box>
  );
};

export default BookmarksPage;
