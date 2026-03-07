import type { ReactNode } from 'react';
import { useRef, useEffect } from 'react';
import { ThemePreview, SystemThemePreview } from './ThemePreview';
import type { SettingsCategory, CloudState, CloudFocus } from './hooks/useSettingsState';

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
  cloud: CloudState;
  onCategoryClick: (category: SettingsCategory) => void;
  onThemeClick: (index: number) => void;
  onHardcoreToggle: () => void;
  onRetentionClick: (index: number) => void;
  onCloudUrlChange: (url: string) => void;
  onCloudKeyChange: (key: string) => void;
  onCloudFocusChange: (focus: CloudFocus) => void;
  onCloudSave: () => void;
  onCloudSync: () => void;
  onCloudConfirmRestore: () => void;
  onCloudDisconnect: () => void;
  onCloudConfirmBackupRestore: () => void;
}

function formatSnapshotDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function CloudSyncContent({ cloud, onCloudUrlChange, onCloudKeyChange, onCloudFocusChange, onCloudSave, onCloudSync, onCloudConfirmRestore, onCloudDisconnect, onCloudConfirmBackupRestore }: Pick<SettingsModalProps, 'cloud' | 'onCloudUrlChange' | 'onCloudKeyChange' | 'onCloudFocusChange' | 'onCloudSave' | 'onCloudSync' | 'onCloudConfirmRestore' | 'onCloudDisconnect' | 'onCloudConfirmBackupRestore'>): ReactNode {
  const urlRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cloud.status === 'unconfigured') {
      if (cloud.focus === 'url') urlRef.current?.focus();
      else if (cloud.focus === 'key') keyRef.current?.focus();
    }
  }, [cloud.focus, cloud.status]);

  if (cloud.status === 'loading') {
    return <div className="cloud-message">{cloud.message || 'Loading...'}</div>;
  }

  if (cloud.status === 'confirming-restore') {
    return (
      <div className="cloud-confirm">
        <div className="cloud-confirm-text">This will replace your local database with cloud data.</div>
        <div className="cloud-confirm-hint">Enter to confirm · Esc to cancel</div>
      </div>
    );
  }

  if (cloud.status === 'confirming-backup-restore') {
    const snap = cloud.snapshots[cloud.selectedSnapshotIndex];
    return (
      <div className="cloud-confirm">
        <div className="cloud-confirm-text">Restore backup from {snap ? formatSnapshotDate(snap.created_at) : ''}?</div>
        <div className="cloud-confirm-hint">Enter to confirm · Esc to cancel</div>
      </div>
    );
  }

  if (cloud.status === 'browsing-backups') {
    return (
      <div className="cloud-backups">
        <div className="cloud-backups-title">Restore from Cloud</div>
        <div className="cloud-backups-list">
          <div className={`cloud-backup-item cloud-backup-latest ${cloud.selectedSnapshotIndex === 0 ? 'selected' : ''}`} onClick={() => onCloudConfirmBackupRestore()}>
            <span className="cloud-backup-date">Restore Latest</span>
          </div>
          {cloud.snapshots.length > 0 && <div className="cloud-backups-section">Restore from Backup</div>}
          {cloud.snapshots.map((snap, i) => (
            <div key={snap.id} className={`cloud-backup-item ${i + 1 === cloud.selectedSnapshotIndex ? 'selected' : ''}`} onClick={() => onCloudConfirmBackupRestore()}>
              <span className="cloud-backup-date">{formatSnapshotDate(snap.created_at)}</span>
              <span className="cloud-backup-tier">{snap.tier}</span>
            </div>
          ))}
        </div>
        <div className="cloud-backups-hint">↑↓ select · Enter restore · Esc back</div>
      </div>
    );
  }

  if (cloud.status === 'unconfigured') {
    return (
      <div className="cloud-setup">
        <div className="cloud-description">Sync your data to Supabase so you can restore it on another machine.</div>
        <label className="cloud-label">Supabase URL</label>
        <input
          ref={urlRef}
          className={`cloud-input ${cloud.focus === 'url' ? 'focused' : ''}`}
          value={cloud.url}
          onChange={e => onCloudUrlChange(e.target.value)}
          onFocus={() => onCloudFocusChange('url')}
          placeholder="https://xxx.supabase.co"
          spellCheck={false}
        />
        <label className="cloud-label">Service Role Key</label>
        <input
          ref={keyRef}
          className={`cloud-input ${cloud.focus === 'key' ? 'focused' : ''}`}
          type="password"
          value={cloud.serviceKey}
          onChange={e => onCloudKeyChange(e.target.value)}
          onFocus={() => onCloudFocusChange('key')}
          placeholder="eyJ..."
          spellCheck={false}
        />
        <div className={`cloud-button ${cloud.focus === 'save' ? 'focused' : ''}`} onClick={onCloudSave}>Save &amp; Connect</div>
        {cloud.message && <div className={`cloud-message ${cloud.messageType}`}>{cloud.message}</div>}
      </div>
    );
  }

  // connected
  const truncatedUrl = cloud.url.length > 40 ? cloud.url.slice(0, 40) + '…' : cloud.url;
  const uploadIcon = <svg className="cloud-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0l-4 4m4-4l4 4"/><path d="M20 16.7A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>;
  const downloadIcon = <svg className="cloud-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12m0 0l4-4m-4 4l-4-4"/><path d="M20 16.7A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>;
  return (
    <div className="cloud-connected">
      <div className="cloud-status-row">
        <span className="cloud-dot" />
        <span>Connected to Supabase</span>
      </div>
      <div className="cloud-url">{truncatedUrl}</div>
      <div className={`cloud-button ${cloud.focus === 'sync' ? 'focused' : ''}`} onClick={onCloudSync}>{uploadIcon} Sync to Cloud</div>
      <div className="cloud-button-hint">Push local database to cloud</div>
      <div className={`cloud-button ${cloud.focus === 'restore' ? 'focused' : ''}`} onClick={onCloudConfirmRestore}>{downloadIcon} Restore from Cloud</div>
      <div className="cloud-button-hint">Restore from cloud or previous backups</div>
      <div className={`cloud-button danger ${cloud.focus === 'disconnect' ? 'focused' : ''}`} onClick={onCloudDisconnect}>✕ Disconnect</div>
      <div className="cloud-button-hint">Remove credentials</div>
      {cloud.message && <div className={`cloud-message ${cloud.messageType}`}>{cloud.message}</div>}
    </div>
  );
}

function getFooterText(category: SettingsCategory, cloud: CloudState): string {
  if (category === 'Theme') return '↑↓ category · ←→ theme · Enter apply · Esc close';
  if (category === 'Hardcore') return '↑↓ category · Enter/Space toggle · Esc close';
  if (category === 'Trash') return '↑↓ category · ←→ retention · Enter apply · Esc close';
  if (cloud.status === 'confirming-restore' || cloud.status === 'confirming-backup-restore') return 'Enter confirm · Esc cancel';
  if (cloud.status === 'browsing-backups') return '↑↓ select · Enter restore · Esc back';
  if (cloud.status === 'unconfigured') return '↑↓ category · Tab fields · Enter save · Esc close';
  return '↑↓ buttons · Enter execute · Esc close';
}

export function SettingsModal({ settingsThemeIndex, settingsCategory, hardcoreMode, trashRetentionIndex, retentionOptions, cloud, onCategoryClick, onThemeClick, onHardcoreToggle, onRetentionClick, onCloudUrlChange, onCloudKeyChange, onCloudFocusChange, onCloudSave, onCloudSync, onCloudConfirmRestore, onCloudDisconnect, onCloudConfirmBackupRestore }: SettingsModalProps): ReactNode {
  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">Settings</div>
        <div className="settings-body">
          <div className="settings-categories">
            <div className={`settings-category ${settingsCategory === 'Theme' ? 'selected' : ''}`} onClick={() => onCategoryClick('Theme')}>Theme</div>
            <div className={`settings-category ${settingsCategory === 'Hardcore' ? 'selected' : ''}`} onClick={() => onCategoryClick('Hardcore')}>Hardcore</div>
            <div className={`settings-category ${settingsCategory === 'Trash' ? 'selected' : ''}`} onClick={() => onCategoryClick('Trash')}>Trash</div>
            <div className={`settings-category ${settingsCategory === 'Cloud Sync' ? 'selected' : ''}`} onClick={() => onCategoryClick('Cloud Sync')}>Cloud Sync</div>
          </div>
          <div className="settings-content">
            {settingsCategory === 'Theme' && (
              <div className="theme-options">
                <div className={`theme-card ${settingsThemeIndex === 0 ? 'selected' : ''}`} onClick={() => onThemeClick(0)}>
                  <ThemePreview themeKey="light" />
                  <div className="theme-label">Light</div>
                </div>
                <div className={`theme-card ${settingsThemeIndex === 1 ? 'selected' : ''}`} onClick={() => onThemeClick(1)}>
                  <ThemePreview themeKey="dark" />
                  <div className="theme-label">Dark</div>
                </div>
                <div className={`theme-card ${settingsThemeIndex === 2 ? 'selected' : ''}`} onClick={() => onThemeClick(2)}>
                  <SystemThemePreview />
                  <div className="theme-label">System</div>
                </div>
              </div>
            )}
            {settingsCategory === 'Hardcore' && (
              <div className="setting-item">
                <div className="setting-row" onClick={onHardcoreToggle}>
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
                      <div key={opt.label} className={`retention-option ${trashRetentionIndex === i ? 'selected' : ''}`} onClick={() => onRetentionClick(i)}>{opt.label}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {settingsCategory === 'Cloud Sync' && (
              <CloudSyncContent cloud={cloud} onCloudUrlChange={onCloudUrlChange} onCloudKeyChange={onCloudKeyChange} onCloudFocusChange={onCloudFocusChange} onCloudSave={onCloudSave} onCloudSync={onCloudSync} onCloudConfirmRestore={onCloudConfirmRestore} onCloudDisconnect={onCloudDisconnect} onCloudConfirmBackupRestore={onCloudConfirmBackupRestore} />
            )}
          </div>
        </div>
        <div className="settings-footer">
          {getFooterText(settingsCategory, cloud)}
        </div>
      </div>
    </div>
  );
}
