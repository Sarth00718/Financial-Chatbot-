/**
 * App Layout
 * Modern SaaS sidebar navigation with glassmorphism styling
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, IconButton, Divider, Avatar, Tooltip, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Chat, Dashboard, AdminPanelSettings, Insights, Bookmark,
  WatchLater, Menu as MenuIcon, ChevronLeft, Logout,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../ThemeToggle';

const DRAWER_WIDTH = 260;

const navItems = [
  { path: '/', label: 'Chat', icon: Chat },
  { path: '/dashboard', label: 'Dashboard', icon: Dashboard },
  { path: '/executive', label: 'Executive', icon: Insights },
  { path: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { path: '/watchlist', label: 'Watchlist', icon: WatchLater },
];

const AppLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Typography variant="h6" fontWeight={800} sx={{
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            FinChatBot
          </Typography>
          <Typography variant="caption" color="text.secondary">Enterprise v3.0</Typography>
        </motion.div>
        {!isMobile && (
          <IconButton size="small" onClick={() => setOpen(false)}>
            <ChevronLeft />
          </IconButton>
        )}
      </Box>

      <Divider />

      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => { navigate(item.path); if (isMobile) setOpen(false); }}
              sx={{
                borderRadius: 2, mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'inherit' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}><Icon fontSize="small" /></ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }} />
            </ListItemButton>
          );
        })}

        {isAdmin && (
          <ListItemButton
            selected={location.pathname === '/admin'}
            onClick={() => navigate('/admin')}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}><AdminPanelSettings fontSize="small" /></ListItemIcon>
            <ListItemText primary="Admin" primaryTypographyProps={{ fontSize: '0.875rem' }} />
          </ListItemButton>
        )}
      </List>

      <Divider />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{user?.email}</Typography>
          </Box>
          <ThemeToggle />
        </Box>
        <Tooltip title="Logout">
          <ListItemButton onClick={logout} sx={{ borderRadius: 2, color: 'error.main' }}>
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><Logout fontSize="small" /></ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.875rem' }} />
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{ position: 'fixed', top: 12, left: 12, zIndex: 1300, bgcolor: 'background.paper', boxShadow: 2 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            position: 'fixed',
            height: '100%',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          ml: !isMobile && open ? `${DRAWER_WIDTH}px` : 0,
          transition: theme.transitions.create(['margin', 'width'], { duration: theme.transitions.duration.enteringScreen }),
          p: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;
