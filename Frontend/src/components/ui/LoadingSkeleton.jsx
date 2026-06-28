/**
 * Loading Skeleton Components
 * Reusable skeleton loaders for dashboard and chat views
 */

import { Skeleton, Box, Stack, Paper } from '@mui/material';

export const ChatSkeleton = () => (
  <Stack spacing={2} sx={{ p: 2 }}>
    {[0, 1, 2].map((i) => (
      <Box key={i} sx={{ display: 'flex', gap: 2, flexDirection: i % 2 ? 'row-reverse' : 'row' }}>
        <Skeleton variant="circular" width={36} height={36} />
        <Skeleton variant="rounded" width={`${60 - i * 10}%`} height={80} />
      </Box>
    ))}
  </Stack>
);

export const DashboardSkeleton = () => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="text" width="40%" height={40} sx={{ mb: 3 }} />
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2, mb: 3 }}>
      {[0, 1, 2, 3].map((i) => (
        <Paper key={i} sx={{ p: 2 }}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={36} />
        </Paper>
      ))}
    </Box>
    <Skeleton variant="rounded" height={300} />
  </Box>
);

export const CardSkeleton = ({ height = 120 }) => (
  <Paper sx={{ p: 2 }}>
    <Skeleton variant="text" width="50%" />
    <Skeleton variant="rounded" height={height - 40} sx={{ mt: 1 }} />
  </Paper>
);

export default { ChatSkeleton, DashboardSkeleton, CardSkeleton };
