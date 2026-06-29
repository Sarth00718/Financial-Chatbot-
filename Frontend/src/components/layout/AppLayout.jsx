/**
 * App Layout — Chatbot-style shell
 * Persistent sidebar + full-height content area.
 * No footer; copyright sits quietly at the bottom of the sidebar.
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, IconButton, Divider, Avatar, Tooltip,
  useMediaQuery, useTheme, Drawer, Stack, Chip,
} from '@mui/material';
import {
  Chat, Dashboard, AdminPanelSettings, Insights, Bookmark,
  WatchLater, Menu as MenuIcon, ChevronLeft, Logout,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../ThemeToggle';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED_WIDTH = 64;

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

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) setOpen(false);
  };

  const sidebarContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ── Brand + toggle ── */}
      <Box
        sx={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          px: 1.5,
          gap: 1,
          flexShrink: 0,
        }}
      >
        {/* Logo mark — always visible */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            flexShrink: 0,
          }}
        >
          <Insights sx={{ color: '#fff', fontSize: 18 }} />
        </Box>

        {/* Wordmark — fades in/out */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="wordmark"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}
            >
              <Box>
                <Typography variant="subtitle2" fontWeight={800} lineHeight={1.1} noWrap>
                  FinChatBot
                </Typography>
                <Typography variant="caption" color="text.secondary" lineHeight={1} noWrap>
                  Enterprise
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <IconButton
            size="small"
            onClick={() => setOpen((o) => !o)}
            sx={{ ml: 'auto', flexShrink: 0 }}
          >
            <motion.div
              animate={{ rotate: open ? 0 : 180 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex' }}
            >
              <ChevronLeft fontSize="small" />
            </motion.div>
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* ── Nav items ── */}
      <List
        sx={{
          flex: 1,
          px: 1,
          py: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 4,
            bgcolor: 'divider',
          },
        }}
      >
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Tooltip
              key={item.path}
              title={!open ? item.label : ''}
              placement="right"
              arrow
            >
              <ListItemButton
                selected={active}
                onClick={() => handleNav(item.path)}
                sx={{
                  mb: 0.5,
                  borderRadius: 2,
                  minHeight: 40,
                  px: 1.25,
                  justifyContent: open ? 'flex-start' : 'center',
                  '& .MuiListItemIcon-root': {
                    minWidth: 0,
                    mr: open ? 1.5 : 0,
                  },
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: '#fff',
                    '& .MuiListItemIcon-root': { color: '#fff' },
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                }}
              >
                <ListItemIcon>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key={`label-${item.path}`}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                    >
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: active ? 700 : 500,
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </ListItemButton>
            </Tooltip>
          );
        })}

        {isAdmin && (
          <Tooltip title={!open ? 'Admin' : ''} placement="right" arrow>
            <ListItemButton
              selected={location.pathname === '/admin'}
              onClick={() => handleNav('/admin')}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                minHeight: 40,
                px: 1.25,
                justifyContent: open ? 'flex-start' : 'center',
                '& .MuiListItemIcon-root': {
                  minWidth: 0,
                  mr: open ? 1.5 : 0,
                },
              }}
            >
              <ListItemIcon>
                <AdminPanelSettings fontSize="small" />
              </ListItemIcon>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="admin-label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                  >
                    <ListItemText
                      primary="Admin"
                      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </ListItemButton>
          </Tooltip>
        )}
      </List>

      <Divider />

      {/* ── User footer ── */}
      <Box sx={{ p: 1, flexShrink: 0 }}>
        {/* Theme + logout row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: open ? 'space-between' : 'center',
            mb: 0.5,
            px: 0.5,
          }}
        >
          <ThemeToggle size="small" />
          {open && (
            <Tooltip title="Logout">
              <IconButton size="small" onClick={logout} color="error">
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* User identity */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 0.5,
            py: 0.75,
            borderRadius: 2,
            '&:hover': { bgcolor: 'action.hover' },
            cursor: 'default',
            overflow: 'hidden',
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
              fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="user-info"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0 }}
              >
                <Typography variant="body2" fontWeight={700} noWrap lineHeight={1.2}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {user?.email}
                </Typography>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout icon when collapsed */}
          {!open && (
            <Tooltip title="Logout" placement="right">
              <IconButton size="small" onClick={logout} color="error" sx={{ ml: 'auto' }}>
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Copyright — only when expanded */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="copyright"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Typography
                variant="caption"
                color="text.disabled"
                display="block"
                textAlign="center"
                sx={{ mt: 1, fontSize: '0.65rem' }}
              >
                © {new Date().getFullYear()} FinChatBot Enterprise
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );

  const drawerWidth = open ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>

      {/* ── Sidebar ── */}
      {isMobile ? (
        // Mobile: temporary overlay drawer
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              border: 'none',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        // Desktop: permanent slim sidebar that expands/collapses
        <Box
          component="nav"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.shorter,
            }),
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
            height: '100vh',
            position: 'sticky',
            top: 0,
          }}
        >
          {sidebarContent}
        </Box>
      )}

      {/* ── Main content ── */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Top bar — thin, unobtrusive */}
        <Box
          component="header"
          sx={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            px: 2,
            gap: 1.5,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {/* Hamburger — mobile only */}
          {isMobile && (
            <IconButton
              edge="start"
              size="small"
              onClick={() => setOpen((o) => !o)}
              sx={{ mr: 0.5 }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          )}

          {/* Page title */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }} noWrap>
            {navItems.find((i) => i.path === location.pathname)?.label ||
              (location.pathname === '/admin' ? 'Admin' : 'FinChatBot')}
          </Typography>

          {isAdmin && (
            <Chip
              size="small"
              label="Admin"
              color="primary"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        {/* Scrollable page body */}
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;