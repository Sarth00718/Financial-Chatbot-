/**
 * Watchlist Page
 * Monitor companies and documents of interest
 */

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, IconButton, Button, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip,
} from '@mui/material';
import { Delete, ArrowBack, Add, WatchLater } from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { enterpriseAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';

const WatchlistPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', notes: '' });

  const fetchWatchlist = async () => {
    try {
      const res = await enterpriseAPI.getWatchlist();
      setItems(res.data.data || []);
    } catch {
      toast.error('Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWatchlist(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    try {
      await enterpriseAPI.addToWatchlist(form);
      setDialogOpen(false);
      setForm({ name: '', company: '', notes: '' });
      fetchWatchlist();
      toast.success('Added to watchlist');
    } catch {
      toast.error('Failed to add');
    }
  };

  const handleDelete = async (id) => {
    try {
      await enterpriseAPI.removeFromWatchlist(id);
      setItems((prev) => prev.filter((i) => i._id !== id));
      toast.success('Removed');
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/')}>Back</Button>
          <Typography variant="h5" fontWeight={700}>Watchlist</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>Add Item</Button>
      </Box>

      {items.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <WatchLater sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">No watchlist items yet</Typography>
        </Paper>
      ) : (
        items.map((item, idx) => (
          <motion.div key={item?._id || idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
            <Paper sx={{ p: 2.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>{item?.name || 'Unnamed Item'}</Typography>
                {item?.company && typeof item.company === 'string' && (
                  <Chip label={item.company} size="small" sx={{ mt: 0.5, mr: 0.5 }} />
                )}
                {item?.notes && typeof item.notes === 'string' && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.notes}</Typography>
                )}
              </Box>
              {item?._id && (
                <IconButton color="error" onClick={() => handleDelete(item._id)}><Delete /></IconButton>
              )}
            </Paper>
          </motion.div>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add to Watchlist</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <TextField label="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <TextField label="Notes" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WatchlistPage;
