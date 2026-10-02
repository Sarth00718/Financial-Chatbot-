import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, IconButton, Tooltip, Stack, alpha, Button,
} from '@mui/material';
import {
  Bookmark, Delete, Chat, AccessTime, AutoAwesome, ArrowForward, BookmarkBorder,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { enterpriseAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import toast from 'react-hot-toast';

const BookmarksPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await enterpriseAPI.getBookmarks();
        setBookmarks(res.data.data || []);
      } catch (err) { console.error('Failed to load bookmarks:', err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleDelete = async (id) => {
    try {
      await enterpriseAPI.deleteBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b._id !== id));
      toast.success('Bookmark removed');
    } catch (err) {
      toast.error('Failed to remove bookmark');
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      {bookmarks.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Paper variant="outlined" sx={{ textAlign: 'center', py: 10, borderRadius: 3 }}>
            <BookmarkBorder sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>No bookmarks yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Save insights and analyses for quick access</Typography>
            <Button variant="contained" onClick={() => navigate('/')} startIcon={<Chat />} sx={{ borderRadius: 2 }}>
              Start a conversation
            </Button>
          </Paper>
        </motion.div>
      ) : (
        <Grid container spacing={2}>
          {bookmarks.map((bookmark, i) => (
            <Grid item xs={12} sm={6} md={4} key={bookmark._id}>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.04 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5, borderRadius: 2, height: '100%', cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
                  }}
                  onClick={() => navigate('/')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha('#7C3AED', 0.1) }}>
                      <Bookmark sx={{ fontSize: 16, color: '#7C3AED' }} />
                    </Box>
                    <Tooltip title="Remove bookmark">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(bookmark._id); }} sx={{ width: 26, height: 26, color: 'error.main' }}>
                        <Delete sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75, fontSize: '0.875rem', lineHeight: 1.3 }}>
                    {bookmark.title || 'Untitled'}
                  </Typography>
                  {bookmark.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, lineHeight: 1.4 }}>
                      {bookmark.description.length > 100 ? `${bookmark.description.substring(0, 97)}...` : bookmark.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip size="small" label={bookmark.type || 'insight'} variant="outlined" sx={{ height: 20, fontSize: '0.6rem', textTransform: 'capitalize' }} />
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', ml: 'auto' }}>
                      {bookmark.createdAt ? new Date(bookmark.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </Typography>
                  </Box>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default BookmarksPage;
