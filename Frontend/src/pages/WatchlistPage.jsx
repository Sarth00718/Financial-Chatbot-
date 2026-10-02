import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, IconButton, Tooltip, Stack, alpha, Button,
} from '@mui/material';
import {
  Visibility, Delete, Chat, AutoAwesome, RemoveRedEye,
  Business, Notes, Label,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { enterpriseAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import toast from 'react-hot-toast';

const WatchlistPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await enterpriseAPI.getWatchlist();
        setWatchlist(res.data.data || []);
      } catch (err) { console.error('Failed to load watchlist:', err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleRemove = async (id) => {
    try {
      await enterpriseAPI.removeFromWatchlist(id);
      setWatchlist((prev) => prev.filter((w) => w._id !== id));
      toast.success('Removed from watchlist');
    } catch (err) {
      toast.error('Failed to remove item');
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      {watchlist.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Paper variant="outlined" sx={{ textAlign: 'center', py: 10, borderRadius: 3 }}>
            <RemoveRedEye sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Watchlist is empty</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Run an analysis and save results to your watchlist</Typography>
            <Button variant="contained" onClick={() => navigate('/')} startIcon={<Chat />} sx={{ borderRadius: 2 }}>
              Start a conversation
            </Button>
          </Paper>
        </motion.div>
      ) : (
        <Grid container spacing={2}>
          {watchlist.map((item, i) => (
            <Grid item xs={12} sm={6} md={4} key={item._id}>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.04 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5, borderRadius: 2, height: '100%',
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: '#16A34A', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha('#16A34A', 0.1) }}>
                      <Visibility sx={{ fontSize: 16, color: '#16A34A' }} />
                    </Box>
                    <Tooltip title="Remove from watchlist">
                      <IconButton size="small" onClick={() => handleRemove(item._id)} sx={{ width: 26, height: 26, color: 'error.main' }}>
                        <Delete sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75, fontSize: '0.875rem', lineHeight: 1.3 }}>
                    {item.name || 'Untitled'}
                  </Typography>

                  {item.company && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                      <Business sx={{ fontSize: 12, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary">{item.company}</Typography>
                    </Box>
                  )}

                  {item.conversation?.title && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                      <AutoAwesome sx={{ fontSize: 12, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary" noWrap>From: {item.conversation.title}</Typography>
                    </Box>
                  )}

                  {item.document?.fileName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                      <Label sx={{ fontSize: 12, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary" noWrap>Doc: {item.document.fileName}</Typography>
                      <Chip size="small" label={item.document.status} variant="outlined" sx={{ height: 16, fontSize: '0.55rem' }} />
                    </Box>
                  )}

                  {item.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.4, fontStyle: 'italic' }}>
                      {item.notes.length > 80 ? `${item.notes.substring(0, 77)}...` : item.notes}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {item.tags?.map((tag, ti) => (
                      <Chip key={ti} size="small" label={tag} variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                    ))}
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', ml: 'auto' }}>
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
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

export default WatchlistPage;
