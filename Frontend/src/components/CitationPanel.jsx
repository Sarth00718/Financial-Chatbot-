/**
 * Citation Panel
 * Displays source citations with page references and snippets
 */

import { useState } from 'react';
import {
  Box, Typography, Chip, Collapse, IconButton, Paper, Stack,
} from '@mui/material';
import { ExpandMore, ExpandLess, Description, Image, TableChart } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const typeIcons = {
  text: Description,
  image: Image,
  scanned_page: Image,
  table: TableChart,
};

const CitationPanel = ({ citations = [] }) => {
  const [expanded, setExpanded] = useState(false);

  if (!citations?.length) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Chip
          label={`${citations.length} source${citations.length > 1 ? 's' : ''}`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontSize: '0.7rem', height: 22 }}
        />
        <IconButton size="small" sx={{ p: 0.25 }}>
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <AnimatePresence>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {citations.map((cite, idx) => {
              const Icon = typeIcons[cite.type] || Description;
              return (
                <motion.div
                  key={`${cite.page}-${cite.namespace}-${idx}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      bgcolor: 'action.hover',
                      borderLeft: 3,
                      borderColor: 'primary.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Icon sx={{ fontSize: 14, color: 'primary.main' }} />
                      <Typography variant="caption" fontWeight={600}>
                        Page {cite.page}
                      </Typography>
                      {cite.source && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          · {cite.source.split(/[/\\]/).pop()}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                      {cite.snippet}
                    </Typography>
                  </Paper>
                </motion.div>
              );
            })}
          </Stack>
        </AnimatePresence>
      </Collapse>
    </Box>
  );
};

export default CitationPanel;
