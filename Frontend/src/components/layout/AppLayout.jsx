import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, IconButton, Tooltip, useMediaQuery, useTheme,
  Drawer, Divider, Avatar, Stack, Badge, alpha,
} from '@mui/material';
import {
  Chat, Dashboard, Insights, Bookmark, Visibility,
  AdminPanelSettings, ChevronLeft, Menu as MenuIcon,
  Logout, Settings, HelpOutline, KeyboardCommandKey,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../ThemeToggle';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED_WIDTH = 68;

const navItems = [
  { path: '/', label: 'Chat', icon: Chat, desc: 'AI conversations' },
  { path: '/dashboard', label: 'Dashboard', icon: Dashboard, desc: 'Your analytics' },
  { path: '/executive', label: 'Executive', icon: Insights, desc: 'Enterprise insights' },
];

const AppLayout = ({ children, sidebarContent: customSidebar, showTopbar = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const handleNav = useCallback((path) => {
    navigate(path);
    if (isMobile) setOpen(false);
  }, [navigate, isMobile]);

  const currentRoute = navItems.find((i) => i.path === location.pathname) ||
    (location.pathname === '/admin' ? { label: 'Admin', icon: AdminPanelSettings, desc: 'System management' } : null);

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Brand */}
      <Box sx={{ height: 60, display: 'flex', alignItems: 'center', px: 1.5, gap: 1.25, flexShrink: 0 }}>
        <Box
          sx={{
            width: 34, height: 34, borderRadius: 1.5, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
          }}
        >
          <Insights sx={{ color: '#fff', fontSize: 16 }} />
        </Box>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="brand"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}
            >
              <Typography variant="subtitle2" fontWeight={800} lineHeight={1.15} noWrap sx={{ letterSpacing: '-0.02em' }}>
                FinChatBot
              </Typography>
              <Typography variant="caption" color="text.secondary" lineHeight={1} noWrap sx={{ fontSize: '0.65rem', letterSpacing: '0.04em' }}>
                FINANCIAL INTELLIGENCE
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
        {!isMobile && (
          <IconButton size="small" onClick={() => setOpen((o) => !o)} sx={{ ml: 'auto', flexShrink: 0, opacity: 0.6 }}>
            <motion.div animate={{ rotate: open ? 0 : 180 }} transition={{ duration: 0.2 }}>
              <ChevronLeft fontSize="small" />
            </motion.div>
          </IconButton>
        )}
      </Box>

      <Divider sx={{ mx: 1.5 }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1, py: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Tooltip key={item.path} title={!open ? item.label : ''} placement="right" arrow>
              <ListItemButton
                selected={active}
                onClick={() => handleNav(item.path)}
                sx={{
                  mb: 0.25, borderRadius: 1.5, minHeight: 40, px: 1.25,
                  justifyContent: open ? 'flex-start' : 'center',
                  '& .MuiListItemIcon-root': { minWidth: 0, mr: open ? 1.5 : 0 },
                  ...(active && {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                    '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 700 },
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
                  }),
                }}
              >
                <ListItemIcon sx={{ color: active ? 'primary.main' : 'text.secondary' }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                    >
                      <ListItemText
                        primary={item.label}
                        secondary={item.desc}
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                        secondaryTypographyProps={{ fontSize: '0.675rem', mt: 0.25 }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </ListItemButton>
            </Tooltip>
          );
        })}
        {/* Admin */}
        {isAdmin && (
          <Tooltip title={!open ? 'Admin' : ''} placement="right" arrow>
            <ListItemButton
              selected={location.pathname === '/admin'}
              onClick={() => handleNav('/admin')}
              sx={{
                mb: 0.25, borderRadius: 1.5, minHeight: 40, px: 1.25,
                justifyContent: open ? 'flex-start' : 'center',
                '& .MuiListItemIcon-root': { minWidth: 0, mr: open ? 1.5 : 0 },
                ...(location.pathname === '/admin' && {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
                }),
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === '/admin' ? 'primary.main' : 'text.secondary' }}>
                <AdminPanelSettings fontSize="small" />
              </ListItemIcon>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                  >
                    <ListItemText
                      primary="Admin"
                      secondary="System management"
                      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                      secondaryTypographyProps={{ fontSize: '0.675rem', mt: 0.25 }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </ListItemButton>
          </Tooltip>
        )}
      </List>

      <Divider sx={{ mx: 1.5 }} />

      {/* User footer */}
      <Box sx={{ p: 1, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', mb: 0.5, px: 0.5 }}>
          <ThemeToggle size="small" />
          {open && (
            <Stack direction="row" gap={0.25}>
              <Tooltip title="Help">
                <IconButton size="small" sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                  <HelpOutline sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Logout">
                <IconButton size="small" onClick={logout} sx={{ color: 'error.main', opacity: 0.6, '&:hover': { opacity: 1 } }}>
                  <Logout sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Box>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, px: 0.75, py: 0.75,
            borderRadius: 1.5, transition: 'background 0.15s',
            '&:hover': { bgcolor: 'action.hover' }, cursor: 'default', overflow: 'hidden',
          }}
        >
          <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: '0.75rem', flexShrink: 0 }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                style={{ overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0 }}
              >
                <Typography variant="body2" fontWeight={700} noWrap lineHeight={1.2}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.675rem' }}>
                  {user?.email}
                </Typography>
              </motion.div>
            )}
          </AnimatePresence>
          {!open && (
            <Tooltip title="Logout" placement="right">
              <IconButton size="small" onClick={logout} sx={{ color: 'error.main' }}>
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );

  const drawerWidth = open ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* ── Sidebar ── */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Box
          component="nav"
          sx={{
            width: drawerWidth, flexShrink: 0,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.shorter,
            }),
            borderRight: '1px solid', borderColor: 'divider',
            bgcolor: 'background.paper', overflow: 'hidden', height: '100vh',
            position: 'sticky', top: 0, zIndex: 100,
          }}
        >
          {customSidebar || sidebarContent}
        </Box>
      )}

      {/* ── Main ── */}
      <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {showTopbar && (
          <Box
            component="header"
            sx={{
              height: 56, display: 'flex', alignItems: 'center', px: 2, gap: 1.5,
              flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider',
              bgcolor: 'background.paper', backdropFilter: 'blur(12px)',
            }}
          >
            {isMobile && (
              <IconButton edge="start" size="small" onClick={() => setOpen((o) => !o)}>
                <MenuIcon fontSize="small" />
              </IconButton>
            )}
            {currentRoute && (
              <>
                <currentRoute.icon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} noWrap>
                    {currentRoute.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.675rem' }}>
                    {currentRoute.desc}
                  </Typography>
                </Box>
              </>
            )}
            {isAdmin && (
              <Badge badgeContent="admin" color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', fontWeight: 700, height: 18, minWidth: 40, borderRadius: 1, textTransform: 'uppercase', letterSpacing: '0.04em', position: 'relative', transform: 'none' } }} />
            )}
          </Box>
        )}
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
