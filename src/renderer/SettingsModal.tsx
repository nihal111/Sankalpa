import type { ReactNode } from 'react';
import { ThemePreview, SystemThemePreview } from './ThemePreview';
import type { SettingsCategory } from './hooks/useSettingsState';

interface RetentionOption {
  readonly label: string;
  readonly value: number | null;
}

interface SettingsModalProps {
  settingsThemeIndex: number;
  settingsCategory: SettingsCategory;
  hardcoreMode: boolean;
  trashRetentionIndex: number;
  retentionOptions: readonly RetentionOption[];
}

export function SettingsModal({ settingsThemeIndex, settingsCategory, hardcoreMode, trashRetentionIndex, retentionOptions }: SettingsModalProps): ReactNode {
  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">Settings</div>
        <div className="settings-body">
          <div className="settings-categories">
            <div className={`settings-category ${settingsCategory === 'Theme' ? 'selected' : ''}`}>Theme</div>
            <div className={`settings-category ${settingsCategory === 'Hardcore' ? 'selected' : ''}`}>Hardcore</div>
            <div className={`settings-category ${settingsCategory === 'Trash' ? 'selected' : ''}`}>Trash</div>
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
            {settingsCategory === 'Trash' && (
              <div className="setting-item">
                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-title">Auto-delete after</div>
                    <div className="setting-description">Automatically purge trashed tasks after this period.</div>
                  </div>
                  <div className="retention-options">
                    {retentionOptions.map((opt, i) => (
                      <div key={opt.label} className={`retention-option ${trashRetentionIndex === i ? 'selected' : ''}`}>{opt.label}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="settings-footer">
          {settingsCategory === 'Theme' ? '↑↓ category · ←→ theme · Enter apply · Esc close' :
           settingsCategory === 'Hardcore' ? '↑↓ category · Enter/Space toggle · Esc close' :
           '↑↓ category · ←→ retention · Enter apply · Esc close'}
        </div>
      </div>
    </div>
  );
}
