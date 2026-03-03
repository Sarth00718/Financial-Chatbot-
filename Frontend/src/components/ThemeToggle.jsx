/**
 * Theme Toggle Component
 * Animated sun/moon button for light/dark mode switching.
 * Self-contained — reads from ThemeContext and applies class to <html>.
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`icon-btn relative overflow-hidden ${className}`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
    >
      {/* Animated icon swap */}
      <span
        className="transition-all duration-300"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-30deg) scale(0.8)',
          opacity: isDark ? 1 : 0,
          position: isDark ? 'static' : 'absolute',
        }}
      >
        <Sun className="w-5 h-5 text-yellow-400" />
      </span>
      <span
        className="transition-all duration-300"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: !isDark ? 'rotate(0deg) scale(1)' : 'rotate(30deg) scale(0.8)',
          opacity: !isDark ? 1 : 0,
          position: !isDark ? 'static' : 'absolute',
        }}
      >
        <Moon className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
      </span>
    </button>
  );
};

export default ThemeToggle;
