import type { ReactNode } from 'react';
import { THEME_COLORS } from './types';

export function ThemePreview({ themeKey }: { themeKey: 'light' | 'dark' }): ReactNode {
  const c = THEME_COLORS[themeKey];
  return (
    <div className="theme-preview" style={{ background: c.bgPrimary, border: `1px solid ${c.border}` }}>
      <div className="theme-preview-sidebar" style={{ background: c.bgSecondary, borderRight: `1px solid ${c.border}` }}>
        <div className="theme-preview-item" style={{ background: c.bgSelected }} />
        <div className="theme-preview-item" style={{ background: c.bgSecondary }} />
      </div>
      <div className="theme-preview-main">
        <div className="theme-preview-item" style={{ background: c.bgSelected }} />
        <div className="theme-preview-item" style={{ background: c.bgPrimary }} />
      </div>
    </div>
  );
}

export function SystemThemePreview(): ReactNode {
  const dark = THEME_COLORS.dark;
  const light = THEME_COLORS.light;
  return (
    <div className="theme-preview" style={{ overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: dark.bgPrimary, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: light.bgPrimary, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
      <div className="theme-preview-sidebar" style={{ background: 'transparent', position: 'relative', zIndex: 1 }}>
        <div className="theme-preview-item" style={{ background: `linear-gradient(135deg, ${dark.bgSelected} 50%, ${light.bgSelected} 50%)` }} />
        <div className="theme-preview-item" style={{ background: `linear-gradient(135deg, ${dark.bgSecondary} 50%, ${light.bgSecondary} 50%)` }} />
      </div>
      <div className="theme-preview-main" style={{ background: 'transparent', position: 'relative', zIndex: 1 }}>
        <div className="theme-preview-item" style={{ background: `linear-gradient(135deg, ${dark.bgSelected} 50%, ${light.bgSelected} 50%)` }} />
        <div className="theme-preview-item" style={{ background: `linear-gradient(135deg, ${dark.bgPrimary} 50%, ${light.bgPrimary} 50%)` }} />
      </div>
    </div>
  );
}
