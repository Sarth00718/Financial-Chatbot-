/**
 * Bookmarks Page — Redesigned
 * Saved analyses with search, tag filter, and full markdown preview.
 */

import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, IconButton, Chip, TextField,
  Stack, Grid, Avatar, Divider, Paper, InputAdornment, Tooltip,
} from '@mui/material';
import {
  Delete, Search, Bookmark as BookmarkIcon,
  Article, AccessTime, FilterList,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { enterpriseAPI } from '../utils/api';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';

/* ─── Bookmark Card ─────────────────────────────────────────────────────── */
const BookmarkCard = ({ bm, onDelete, delay = 0 }) => {
  const [expanded, setExpanded] = useState(false);

  const preview = (bm?.content || '').slice(0, 280);
  const hasMore = (bm?.content || '').length > 280;
  const tagLabel = bm?.analysisType ? bm.analysisType.replace(/_/g, ' ') : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
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
        {/* Card header */}
        <CardContent sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0, flex: 1 }}>
              <Avatar
                sx={{
                  width: 36, height: 36, flexShrink: 0,
                  background: 'linear-gradient(135deg, #2563EB22, #7C3AED22)',
                }}
              >
                <Article sx={{ color: 'primary.main', fontSize: 18 }} />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {bm?.title || 'Untitled Bookmark'}
                </Typography>
                {tagLabel && (
                  <Chip
                    label={tagLabel}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
            </Stack>
            {bm?._id && (
              <Tooltip title="Delete bookmark">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(bm._id)}
                  sx={{
                    flexShrink: 0, opacity: 0.6,
                    '&:hover': { opacity: 1 },
                  }}
                >
                  <Delete sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </CardContent>

        <Divider sx={{ mx: 2.5, my: 1.5 }} />

        {/* Markdown preview */}
        <CardContent sx={{ pt: 0, flex: 1 }}>
          <Box
            className="prose-chat"
            sx={{
              fontSize: '0.8125rem',
              color: 'text.secondary',
              overflow: 'hidden',
              maxHeight: expanded ? 'none' : 120,
              transition: 'max-height 0.3s ease',
              '& p': { mt: 0, mb: 1, lineHeight: 1.65 },
              '& strong': { color: 'text.primary' },
              '& h1,& h2,& h3': { fontSize: '0.875rem', fontWeight: 700, mt: 0, mb: 0.5 },
              '& ul,& ol': { pl: 2, mb: 1 },
              '& li': { mb: 0.25, lineHeight: 1.6 },
            }}
          >
            <ReactMarkdown>{expanded ? (bm?.content || '') : preview + (hasMore && !expanded ? '…' : '')}</ReactMarkdown>
          </Box>

          {hasMore && (
            <Box
              component="button"
              onClick={() => setExpanded((e) => !e)}
              sx={{
                mt: 1, background: 'none', border: 'none', cursor: 'pointer',
                color: 'primary.main', fontSize: '0.75rem', fontWeight: 600, p: 0,
              }}
            >
              {expanded ? 'Show less' : 'Read more'}
            </Box>
          )}
        </CardContent>

        {/* Footer */}
        {bm?.createdAt && (
          <Box sx={{ px: 2.5, pb: 2 }}>
            <Stack direction="row" alignItems="center" gap={0.75}>
              <AccessTime sx={{ fontSize: 12, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">
                {new Date(bm.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </Typography>
            </Stack>
          </Box>
        )}
      </Card>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */

const BookmarksPage = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');

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

  /* derive unique tags */
  const allTags = [...new Set(
    bookmarks
      .map((b) => b?.analysisType)
      .filter(Boolean)
      .map((t) => (typeof t === 'string' ? t.replace(/_/g, ' ') : null))
      .filter(Boolean),
  )];

  const filtered = bookmarks.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (b?.title || '').toLowerCase().includes(q) ||
      (b?.content || '').toLowerCase().includes(q);
    const matchesTag =
      !activeTag ||
      (b?.analysisType || '').replace(/_/g, ' ') === activeTag;
    return matchesSearch && matchesTag;
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
              <BookmarkIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} lineHeight={1.2}>Bookmarks</Typography>
              <Typography variant="body2" color="text.secondary">
                {bookmarks.length} saved {bookmarks.length === 1 ? 'analysis' : 'analyses'}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </motion.div>

      {/* ── Search & filters ────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mb: 2.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search bookmarks…"
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
            sx={{ maxWidth: { sm: 360 } }}
          />
        </Stack>

        {allTags.length > 0 && (
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
            <FilterList sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Chip
              label="All"
              size="small"
              color={!activeTag ? 'primary' : 'default'}
              variant={!activeTag ? 'filled' : 'outlined'}
              onClick={() => setActiveTag('')}
              sx={{ cursor: 'pointer' }}
            />
            {allTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                color={activeTag === tag ? 'primary' : 'default'}
                variant={activeTag === tag ? 'filled' : 'outlined'}
                onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        )}
      </motion.div>

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
                <BookmarkIcon sx={{ fontSize: 30, color: 'primary.main' }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                {search || activeTag ? 'No matching bookmarks' : 'No bookmarks yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, mx: 'auto' }}>
                {search || activeTag
                  ? 'Try adjusting your search or filter.'
                  : 'Save analyses from the Enterprise panel to see them here.'}
              </Typography>
            </Paper>
          </motion.div>
        ) : (
          <Grid container spacing={2}>
            {filtered.map((bm, idx) => (
              <Grid item xs={12} sm={6} lg={4} key={bm?._id || idx}>
                <BookmarkCard bm={bm} onDelete={handleDelete} delay={idx * 0.04} />
              </Grid>
            ))}
          </Grid>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default BookmarksPage;
