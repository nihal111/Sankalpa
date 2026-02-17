import type { Theme } from './types';
import { ThemePreview, SystemThemePreview } from './ThemePreview';

interface SettingsModalProps {
  settingsThemeIndex: number;
  themes: Theme[];
}

export function SettingsModal({ settingsThemeIndex, themes }: SettingsModalProps): JSX.Element {
  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">Settings</div>
        <div className="settings-body">
          <div className="settings-categories">
            <div className="settings-category selected">Theme</div>
          </div>
          <div className="settings-content">
            <div className="theme-options">
              <div className={`theme-card ${settingsThemeIndex === 0 ? 'selected' : ''}`}>
                <ThemePreview themeKey="light" />
                <div className="theme-label">Light</div>
              </div>
              <div className={`theme-card ${settingsThemeIndex === 1 ? 'selected' : ''}`}>
                <ThemePreview themeKey="dark" />
                <div className="theme-label">Dark</div>
              </div>
              <div className={`theme-card ${settingsThemeIndex === 2 ? 'selected' : ''}`}>
                <SystemThemePreview />
                <div className="theme-label">System</div>
              </div>
            </div>
          </div>
        </div>
        <div className="settings-footer">←→ select theme · Enter apply · Esc close</div>
      </div>
    </div>
  );
}
