import { Box, Skeleton, Paper, alpha } from '@mui/material';

const SkeletonLine = ({ width = '100%', height = 14 }) => (
  <Skeleton
    variant="text"
    width={width}
    height={height}
    sx={{
      borderRadius: 1,
      animation: 'shimmer 1.5s ease-in-out infinite',
      bgcolor: 'action.hover',
      '@keyframes shimmer': {
        '0%': { opacity: 0.6 },
        '50%': { opacity: 1 },
        '100%': { opacity: 0.6 },
      },
    }}
  />
);

export const ChatSkeleton = () => (
  <Box sx={{ px: 2, py: 4 }}>
    {[1, 2, 3].map((i) => (
      <Box
        key={i}
        sx={{
          display: 'flex', gap: 1.5, mb: 3,
          flexDirection: i % 2 === 0 ? 'row-reverse' : 'row',
        }}
      >
        <Skeleton variant="circular" width={32} height={32} sx={{ flexShrink: 0 }} />
        <Box sx={{ flex: 1, maxWidth: '70%' }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2, borderRadius: i % 2 === 0 ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              bgcolor: 'action.hover',
              borderColor: 'divider',
            }}
          >
            <SkeletonLine width="85%" />
            <SkeletonLine width="70%" />
            {i === 2 && <SkeletonLine width="45%" />}
          </Paper>
        </Box>
      </Box>
    ))}
  </Box>
);

export const DashboardSkeleton = () => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="text" width={240} height={32} sx={{ mb: 3, borderRadius: 1 }} />
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2, mb: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <Paper key={i} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Skeleton variant="text" width="60%" height={14} sx={{ mb: 1.5 }} />
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="text" width="30%" height={12} sx={{ mt: 1 }} />
        </Paper>
      ))}
    </Box>
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Skeleton variant="text" width="40%" height={18} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 1 }} />
    </Paper>
  </Box>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <Box sx={{ p: 2 }}>
    {[...Array(rows)].map((_, i) => (
      <Box key={i} sx={{ display: 'flex', gap: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Skeleton variant="text" width="30%" height={14} />
        <Skeleton variant="text" width="25%" height={14} />
        <Skeleton variant="text" width="20%" height={14} />
        <Skeleton variant="text" width="15%" height={14} />
      </Box>
    ))}
  </Box>
);
