/**
 * Feature Selector Component
 * Horizontal compact tab switcher for AI mode selection.
 * Fully themed via CSS custom properties.
 */

import { Brain, FileText, TrendingUp, MessageCircle } from 'lucide-react';

const FEATURES = [
  { id: 'Smart_Chat',          name: 'Smart Chat',   shortName: 'Chat',    icon: Brain,         accent: '#2563eb', lightBg: '#dbeafe', darkBg: '#1e3a5f', lightText: '#1d4ed8', darkText: '#93c5fd' },
  { id: 'Document_Analysis',   name: 'Documents',    shortName: 'Docs',    icon: FileText,      accent: '#16a34a', lightBg: '#dcfce7', darkBg: '#052e16', lightText: '#15803d', darkText: '#4ade80' },
  { id: 'Analytical_Insights', name: 'Insights',     shortName: 'Insights',icon: TrendingUp,    accent: '#7c3aed', lightBg: '#ede9fe', darkBg: '#2e1065', lightText: '#6d28d9', darkText: '#c4b5fd' },
  { id: 'General_Conversation',name: 'General',      shortName: 'General', icon: MessageCircle, accent: '#475569', lightBg: '#f1f5f9', darkBg: '#1e293b', lightText: '#334155', darkText: '#94a3b8' },
];

const FeatureSelector = ({ selectedFeature, onFeatureChange, disabled }) => {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      {FEATURES.map((feature) => {
        const Icon      = feature.icon;
        const isActive  = selectedFeature === feature.id;

        return (
          <button
            key={feature.id}
            onClick={() => onFeatureChange(feature.id)}
            disabled={disabled}
            title={feature.name}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg
              border-2 transition-all duration-150 whitespace-nowrap
              text-xs sm:text-sm font-medium
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{
              backgroundColor: isActive ? 'var(--feature-active-bg)' : 'transparent',
              borderColor:     isActive ? feature.accent : 'var(--color-border)',
              color:           isActive ? 'var(--feature-active-text)' : 'var(--color-text-secondary)',
              '--feature-active-bg':   `var(--is-dark, ${feature.darkBg}) var(--is-light, ${feature.lightBg})`,
              '--feature-active-text': `var(--is-dark, ${feature.darkText}) var(--is-light, ${feature.lightText})`,
            }}
            onMouseEnter={(e) => {
              if (!isActive && !disabled) {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                e.currentTarget.style.borderColor = feature.accent;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }
            }}
          >
            <Icon
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ color: isActive ? feature.accent : 'currentColor' }}
            />
            {/* Full name on sm+, short on xs */}
            <span className="hidden sm:inline">{feature.name}</span>
            <span className="sm:hidden">{feature.shortName}</span>
          </button>
        );
      })}
    </div>
  );
};

export default FeatureSelector;
