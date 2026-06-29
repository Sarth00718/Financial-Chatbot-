/**
 * Feature Selector
 * Compact AI-mode switcher built on MUI ToggleButtonGroup.
 */

import { ToggleButton, ToggleButtonGroup, Box, useMediaQuery, useTheme as useMuiTheme } from '@mui/material';
import { Psychology, Description, TrendingUp, Forum } from '@mui/icons-material';

const FEATURES = [
  { id: 'Smart_Chat', name: 'Smart Chat', shortName: 'Chat', icon: Psychology, color: '#2563EB' },
  { id: 'Document_Analysis', name: 'Documents', shortName: 'Docs', icon: Description, color: '#16A34A' },
  { id: 'Analytical_Insights', name: 'Insights', shortName: 'Insights', icon: TrendingUp, color: '#7C3AED' },
  { id: 'General_Conversation', name: 'General', shortName: 'General', icon: Forum, color: '#64748B' },
];

const FeatureSelector = ({ selectedFeature, onFeatureChange, disabled }) => {
  const muiTheme = useMuiTheme();
  const isSmall = useMediaQuery(muiTheme.breakpoints.down('sm'));

  return (
    <ToggleButtonGroup
      value={selectedFeature}
      exclusive
      size="small"
      onChange={(_, val) => val && onFeatureChange(val)}
      disabled={disabled}
      sx={{
        gap: 0.5,
        '& .MuiToggleButtonGroup-grouped': {
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px !important',
        },
      }}
    >
      {FEATURES.map((feature) => {
        const Icon = feature.icon;
        const isActive = selectedFeature === feature.id;
        return (
          <ToggleButton
            key={feature.id}
            value={feature.id}
            sx={{
              px: 1.5,
              py: 0.75,
              textTransform: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              gap: 0.75,
              color: isActive ? feature.color : 'text.secondary',
              borderColor: isActive ? `${feature.color}66` : undefined,
              bgcolor: isActive ? `${feature.color}1A` : 'transparent',
              '&.Mui-selected': {
                bgcolor: `${feature.color}1A`,
                color: feature.color,
                '&:hover': { bgcolor: `${feature.color}26` },
              },
            }}
          >
            <Icon sx={{ fontSize: 16 }} />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{feature.name}</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>{feature.shortName}</Box>
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
};

export default FeatureSelector;
