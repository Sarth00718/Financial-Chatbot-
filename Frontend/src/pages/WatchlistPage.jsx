/**
 * Watchlist Page — Redesigned
 * Company/document monitoring with card grid layout.
 */

import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, IconButton, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Stack, Grid,
  Avatar, Paper, Tooltip, InputAdornment, Divider,
} from '@mui/material';
import {
  Delete, Add, WatchLater, Business, Notes, Search,
  Star, StarBorder,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { enterpriseAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';

/* ─── Palette for company avatars ────────────────────────────────────────── */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #2563EB, #1D4ED8)',
  'linear-gradient(135deg, #7C3AED, #6D28D9)',
  'linear-gradient(135deg, #16A34A, #15803D)',
  'linear-gradient(135deg, #F59E0B, #B45309)',
  'linear-gradient(135deg, #DC2626, #B91C1C)',
  'linear-gradient(135deg, #0EA5E9, #0284C7)',
];

/* ─── Watchlist Card ─────────────────────────────────────────────────────── */
const WatchCard = ({ item, onDelete, index, delay = 0 }) => {
  const initials = (item?.name || 'W').slice(0, 2).toUpperCase();
  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  const [starred, setStarred] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'box-shadow 0.2s, transform 0.2s',
          '&:hover': {
            boxShadow: (t) =>
              t.palette.mode === 'dark'
                ? '0 8px 24px rgba(0,0,0,0.45)'
                : '0 8px 24px rgba(15,23,42,0.10)',
            transform: 'translateY(-2px)',
          },
        }}
      >
        <CardContent sx={{ flex: 1 }}>
          {/* Header row */}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Avatar
                sx={{
                  width: 44, height: 44, fontSize: '0.875rem', fontWeight: 800,
                  background: gradient, flexShrink: 0,
                }}
              >
                {initials}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {item?.name || 'Unnamed Item'}
                </Typography>
                {item?.company && (
                  <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.25 }}>
                    <Business sx={{ fontSize: 12, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {item.company}
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Stack>

            <Stack direction="row" alignItems="center" gap={0.25}>
              <Tooltip title={starred ? 'Unstar' : 'Star'}>
                <IconButton
                  size="small"
                  onClick={() => setStarred((s) => !s)}
                  sx={{ color: starred ? 'warning.main' : 'text.disabled' }}
                >
                  {starred ? <Star sx={{ fontSize: 17 }} /> : <StarBorder sx={{ fontSize: 17 }} />}
                </IconButton>
              </Tooltip>
              {item?._id && (
                <Tooltip title="Remove">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(item._id)}
                    sx={{ opacity: 0.65, '&:hover': { opacity: 1 } }}
                  >
                    <Delete sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>

          {/* Notes */}
          {item?.notes && (
            <Box
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 2,
                px: 1.5, py: 1,
              }}
            >
              <Stack direction="row" alignItems="flex-start" gap={0.75}>
                <Notes sx={{ fontSize: 14, color: 'text.secondary', mt: 0.2, flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary" lineHeight={1.65}>
                  {item.notes}
                </Typography>
              </Stack>
            </Box>
          )}
        </CardContent>

        {/* Footer */}
        <Box sx={{ px: 2.5, pb: 2 }}>
          <Chip
            size="small"
            label="Monitoring"
            color="success"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        </Box>
      </Card>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */

const WatchlistPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', company: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

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
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      setSubmitting(true);
      await enterpriseAPI.addToWatchlist(form);
      setDialogOpen(false);
      setForm({ name: '', company: '', notes: '' });
      fetchWatchlist();
      toast.success('Added to watchlist');
    } catch {
      toast.error('Failed to add');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await enterpriseAPI.removeFromWatchlist(id);
      setItems((prev) => prev.filter((i) => i._id !== id));
      toast.success('Removed from watchlist');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item?.name || '').toLowerCase().includes(q) ||
      (item?.company || '').toLowerCase().includes(q) ||
      (item?.notes || '').toLowerCase().includes(q)
    );
  });

  if (loading) return <DashboardSkeleton />;

  return (
    <Box sx={{ width: '100%', p: { xs: 2, sm: 2.5, md: 3 }, maxWidth: 1280, mx: 'auto' }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          gap={2}
          sx={{ mb: 3 }}
        >
          <Stack direction="row" alignItems="center" gap={1.75}>
            <Box
              sx={{
                width: 44, height: 44, borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              }}
            >
              <WatchLater sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} lineHeight={1.2}>Watchlist</Typography>
              <Typography variant="body2" color="text.secondary">
                {items.length} {items.length === 1 ? 'item' : 'items'} being monitored
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{ flexShrink: 0 }}
          >
            Add Item
          </Button>
        </Stack>
      </motion.div>

      {/* ── Search ──────────────────────────────────────────────── */}
      {items.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search watchlist…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 3, maxWidth: 360 }}
          />
        </motion.div>
      )}

      {/* ── Cards grid ──────────────────────────────────────────── */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Paper
              sx={{
                p: 6, textAlign: 'center',
                border: '2px dashed', borderColor: 'divider', bgcolor: 'transparent',
              }}
            >
              <Box
                sx={{
                  width: 64, height: 64, borderRadius: '50%', mx: 'auto', mb: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #2563EB18, #7C3AED18)',
                }}
              >
                <WatchLater sx={{ fontSize: 30, color: 'primary.main' }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                {search ? 'No matching items' : 'Watchlist is empty'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, mx: 'auto', mb: 3 }}>
                {search
                  ? 'Try a different search term.'
                  : 'Track companies and documents you want to monitor over time.'}
              </Typography>
              {!search && (
                <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
                  Add your first item
                </Button>
              )}
            </Paper>
          </motion.div>
        ) : (
          <Grid container spacing={2}>
            {filtered.map((item, idx) => (
              <Grid item xs={12} sm={6} lg={4} key={item?._id || idx}>
                <WatchCard
                  item={item}
                  onDelete={handleDelete}
                  index={idx}
                  delay={idx * 0.04}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </AnimatePresence>

      {/* ── Add dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 1.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              }}
            >
              <Add sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Add to Watchlist</Typography>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2.5}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              fullWidth
              placeholder="e.g. Apple Q4 Report"
              helperText="A short name to identify this watchlist item"
            />
            <TextField
              label="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              fullWidth
              placeholder="e.g. Apple Inc."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label="Notes"
              multiline
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              fullWidth
              placeholder="Optional notes about this watchlist item…"
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={submitting || !form.name.trim()}>
            Add to Watchlist
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WatchlistPage;
