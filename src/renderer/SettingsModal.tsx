import { ThemePreview, SystemThemePreview } from './ThemePreview';

interface SettingsModalProps {
  settingsThemeIndex: number;
  settingsCategory: 'Theme' | 'Hardcore';
  hardcoreMode: boolean;
}

export function SettingsModal({ settingsThemeIndex, settingsCategory, hardcoreMode }: SettingsModalProps): JSX.Element {
  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">Settings</div>
        <div className="settings-body">
          <div className="settings-categories">
            <div className={`settings-category ${settingsCategory === 'Theme' ? 'selected' : ''}`}>Theme</div>
            <div className={`settings-category ${settingsCategory === 'Hardcore' ? 'selected' : ''}`}>Hardcore</div>
          </div>
          <div className="settings-content">
            {settingsCategory === 'Theme' && (
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
            )}
            {settingsCategory === 'Hardcore' && (
              <div className="setting-item">
                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-title">Enable Hardcore Mode</div>
                    <div className="setting-description">Disables mouse interactions and hides the cursor completely.</div>
                  </div>
                  <div className={`toggle ${hardcoreMode ? 'on' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="settings-footer">
          {settingsCategory === 'Theme' ? '↑↓ category · ←→ theme · Enter apply · Esc close' : '↑↓ category · Enter/Space toggle · Esc close'}
        </div>
      </div>
    </div>
  );
}
