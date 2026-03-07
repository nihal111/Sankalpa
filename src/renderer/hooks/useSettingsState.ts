import { useEffect, useState, useCallback } from 'react';
import type { Theme } from '../types';
import { parseRetentionDays } from '../../shared/trashRetention';

const THEMES: Theme[] = ['light', 'dark', 'system'];
const CATEGORIES = ['Theme', 'Hardcore', 'Trash', 'Cloud Sync'] as const;
export type SettingsCategory = typeof CATEGORIES[number];

const RETENTION_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: 'Never', value: null },
] as const;

export interface SettingsActions {
  open: () => void;
  handleKeyDown: (e: KeyboardEvent) => boolean;
  setCloudField: (field: 'url' | 'serviceKey', value: string) => void;
  setCategory: (category: SettingsCategory) => void;
  setThemeIndex: (index: number) => void;
  toggleHardcore: () => void;
  setTrashRetentionIndex: (index: number) => void;
  setCloudFocus: (focus: CloudFocus) => void;
  cloudSave: () => void;
  cloudSync: () => void;
  cloudConfirmRestore: () => void;
  cloudDisconnect: () => void;
  cloudBrowseBackups: () => void;
  cloudConfirmBackupRestore: () => void;
}

export type CloudStatus = 'unconfigured' | 'connected' | 'loading' | 'confirming-restore' | 'browsing-backups' | 'confirming-backup-restore';
export type CloudFocus = 'url' | 'key' | 'save' | 'sync' | 'restore' | 'disconnect' | 'backup';

export interface CloudState {
  status: CloudStatus;
  url: string;
  serviceKey: string;
  focus: CloudFocus;
  message: string;
  messageType: 'success' | 'error' | '';
  snapshots: { id: string; tier: string; created_at: number }[];
  selectedSnapshotIndex: number;
}

export function useSettingsState(): [
  {
    settingsOpen: boolean; settingsThemeIndex: number; themes: Theme[]; hardcoreMode: boolean;
    settingsCategory: SettingsCategory; trashRetentionIndex: number; retentionOptions: typeof RETENTION_OPTIONS;
    cloud: CloudState;
  },
  SettingsActions
] {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<SettingsCategory>('Theme');
  const [theme, setTheme] = useState<Theme>('system');
  const [hardcoreMode, setHardcoreMode] = useState(false);
  const [settingsThemeIndex, setSettingsThemeIndex] = useState(0);
  const [trashRetentionIndex, setTrashRetentionIndex] = useState(0);
  const [cloud, setCloud] = useState<CloudState>({
    status: 'unconfigured', url: '', serviceKey: '', focus: 'url', message: '', messageType: '',
    snapshots: [], selectedSnapshotIndex: 0,
  });

  // Load settings from DB on mount
  useEffect(() => {
    window.api.settingsGetAll().then((settings: Record<string, string>) => {
      if (settings.theme && THEMES.includes(settings.theme as Theme)) {
        setTheme(settings.theme as Theme);
      }
      if (settings.hardcore_mode !== undefined) {
        setHardcoreMode(settings.hardcore_mode === '1');
      }
      if (settings.trash_retention_days !== undefined) {
        const parsed = parseRetentionDays(settings.trash_retention_days);
        const idx = RETENTION_OPTIONS.findIndex((o) => o.value === parsed);
        if (idx >= 0) setTrashRetentionIndex(idx);
      }
      if (settings.supabase_url && settings.supabase_service_role_key) {
        setCloud(c => ({
          ...c, status: 'connected', url: settings.supabase_url, serviceKey: settings.supabase_service_role_key, focus: 'sync',
        }));
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('hardcore', hardcoreMode);
  }, [hardcoreMode]);

  const open = useCallback(() => {
    setSettingsOpen(true);
    setSettingsCategory('Theme');
    setSettingsThemeIndex(THEMES.indexOf(theme));
    setCloud(c => ({ ...c, message: '', messageType: '' }));
  }, [theme]);

  const applyAndClose = useCallback(() => {
    if (settingsCategory === 'Theme') {
      const newTheme = THEMES[settingsThemeIndex];
      setTheme(newTheme);
      window.api.settingsSet('theme', newTheme);
    }
    setSettingsOpen(false);
  }, [settingsCategory, settingsThemeIndex]);

  const toggleHardcore = useCallback(() => {
    const newValue = !hardcoreMode;
    setHardcoreMode(newValue);
    window.api.settingsSet('hardcore_mode', newValue ? '1' : '0');
  }, [hardcoreMode]);

  const cloudSaveAndConnect = useCallback(async (): Promise<void> => {
    if (!cloud.url.trim() || !cloud.serviceKey.trim()) {
      setCloud(c => ({ ...c, message: 'Both fields are required', messageType: 'error' }));
      return;
    }
    setCloud(c => ({ ...c, status: 'loading', message: 'Connecting...', messageType: '' }));
    const result = await window.api.cloudTestConnection(cloud.url.trim(), cloud.serviceKey.trim());
    if (result.success) {
      await window.api.settingsSet('supabase_url', cloud.url.trim());
      await window.api.settingsSet('supabase_service_role_key', cloud.serviceKey.trim());
      setCloud(c => ({ ...c, status: 'connected', focus: 'sync', message: 'Connected', messageType: 'success' }));
    } else {
      setCloud(c => ({ ...c, status: 'unconfigured', focus: 'save', message: result.message, messageType: 'error' }));
    }
  }, [cloud.url, cloud.serviceKey]);

  const cloudDoSync = useCallback(async (): Promise<void> => {
    setCloud(c => ({ ...c, status: 'loading', message: 'Syncing...', messageType: '' }));
    const result = await window.api.cloudSync();
    setCloud(c => ({
      ...c, status: 'connected', focus: 'sync',
      message: result.success ? `✓ Synced ${result.message}` : `✗ ${result.message}`,
      messageType: result.success ? 'success' : 'error',
    }));
  }, []);

  const cloudDoRestore = useCallback(async (): Promise<void> => {
    setCloud(c => ({ ...c, status: 'loading', message: 'Restoring...', messageType: '' }));
    const result = await window.api.cloudRestore();
    setCloud(c => ({
      ...c, status: 'connected', focus: 'restore',
      message: result.success ? `✓ Restored ${result.message}` : `✗ ${result.message}`,
      messageType: result.success ? 'success' : 'error',
    }));
  }, []);

  const cloudDisconnect = useCallback(async (): Promise<void> => {
    await window.api.settingsSet('supabase_url', '');
    await window.api.settingsSet('supabase_service_role_key', '');
    setCloud({ status: 'unconfigured', url: '', serviceKey: '', focus: 'url', message: '', messageType: '', snapshots: [], selectedSnapshotIndex: 0 });
  }, []);

  const cloudBrowseBackups = useCallback(async (): Promise<void> => {
    setCloud(c => ({ ...c, status: 'loading', message: 'Loading backups...', messageType: '' }));
    const { result, snapshots } = await window.api.cloudListSnapshots();
    if (!result.success) {
      setCloud(c => ({ ...c, status: 'connected', focus: 'backup', message: `✗ ${result.message}`, messageType: 'error' }));
      return;
    }
    if (snapshots.length === 0) {
      setCloud(c => ({ ...c, status: 'connected', focus: 'backup', message: 'No backups yet — backups are created automatically when you sync', messageType: 'success' }));
      return;
    }
    setCloud(c => ({ ...c, status: 'browsing-backups', snapshots, selectedSnapshotIndex: 0, message: '', messageType: '' }));
  }, []);

  const cloudRestoreSnapshot = useCallback(async (): Promise<void> => {
    const snap = cloud.snapshots[cloud.selectedSnapshotIndex];
    if (!snap) return;
    setCloud(c => ({ ...c, status: 'loading', message: 'Restoring backup...', messageType: '' }));
    const result = await window.api.cloudRestoreSnapshot(snap.id);
    setCloud(c => ({
      ...c, status: 'connected', focus: 'backup',
      message: result.success ? `✓ Restored ${result.message}` : `✗ ${result.message}`,
      messageType: result.success ? 'success' : 'error',
    }));
  }, [cloud.snapshots, cloud.selectedSnapshotIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    if (!settingsOpen) return false;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (cloud.status === 'confirming-restore' || cloud.status === 'confirming-backup-restore') {
        setCloud(c => ({ ...c, status: 'connected', focus: 'restore', message: '', messageType: '', snapshots: [], selectedSnapshotIndex: 0 }));
        return true;
      }
      if (cloud.status === 'browsing-backups') {
        setCloud(c => ({ ...c, status: 'connected', focus: 'backup', message: '', messageType: '', snapshots: [], selectedSnapshotIndex: 0 }));
        return true;
      }
      setSettingsOpen(false);
      return true;
    }

    // Category navigation — only when not focused on text inputs
    if (settingsCategory !== 'Cloud Sync' || (cloud.status !== 'unconfigured' && cloud.status !== 'loading')) {
      if (e.key === 'ArrowUp') {
        const idx = CATEGORIES.indexOf(settingsCategory);
        if (settingsCategory !== 'Cloud Sync') {
          if (idx > 0) { e.preventDefault(); setSettingsCategory(CATEGORIES[idx - 1]); return true; }
        } else {
          // From Cloud Sync: only leave if on first focusable item
          const firstFocus = cloud.status === 'connected' ? 'sync' : 'url';
          if (cloud.focus === firstFocus) { e.preventDefault(); setSettingsCategory(CATEGORIES[idx - 1]); return true; }
        }
      }
      if (e.key === 'ArrowDown') {
        const idx = CATEGORIES.indexOf(settingsCategory);
        if (settingsCategory !== 'Cloud Sync' && idx < CATEGORIES.length - 1) {
          e.preventDefault();
          const next = CATEGORIES[idx + 1];
          setSettingsCategory(next);
          if (next === 'Cloud Sync') {
            setCloud(c => ({ ...c, focus: c.status === 'connected' ? 'sync' : 'url' }));
          }
          return true;
        }
      }
    }

    if (settingsCategory === 'Theme') {
      if (e.key === 'ArrowLeft') { e.preventDefault(); setSettingsThemeIndex((i) => Math.max(0, i - 1)); return true; }
      if (e.key === 'ArrowRight') { e.preventDefault(); setSettingsThemeIndex((i) => Math.min(THEMES.length - 1, i + 1)); return true; }
      if (e.key === 'Enter') { e.preventDefault(); applyAndClose(); return true; }
    }
    if (settingsCategory === 'Hardcore') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHardcore(); return true; }
    }
    if (settingsCategory === 'Trash') {
      if (e.key === 'ArrowLeft') { e.preventDefault(); setTrashRetentionIndex((i) => Math.max(0, i - 1)); return true; }
      if (e.key === 'ArrowRight') { e.preventDefault(); setTrashRetentionIndex((i) => Math.min(RETENTION_OPTIONS.length - 1, i + 1)); return true; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const opt = RETENTION_OPTIONS[trashRetentionIndex];
        window.api.settingsSet('trash_retention_days', opt.value === null ? 'never' : String(opt.value));
        setSettingsOpen(false);
        return true;
      }
    }
    if (settingsCategory === 'Cloud Sync') {
      if (cloud.status === 'loading') return true; // block input while loading

      if (cloud.status === 'confirming-restore') {
        if (e.key === 'Enter') { e.preventDefault(); cloudDoRestore(); return true; }
        return true; // Esc handled above
      }

      if (cloud.status === 'confirming-backup-restore') {
        if (e.key === 'Enter') { e.preventDefault(); cloudRestoreSnapshot(); return true; }
        return true;
      }

      if (cloud.status === 'browsing-backups') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCloud(c => ({ ...c, selectedSnapshotIndex: Math.max(0, c.selectedSnapshotIndex - 1) }));
          return true;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCloud(c => ({ ...c, selectedSnapshotIndex: Math.min(c.snapshots.length - 1, c.selectedSnapshotIndex + 1) }));
          return true;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          setCloud(c => ({ ...c, status: 'confirming-backup-restore' }));
          return true;
        }
        return true;
      }

      // Let native key combos (Cmd+V, Cmd+A, Cmd+C, Cmd+X) through to inputs
      if (e.metaKey || e.ctrlKey) return false;

      if (cloud.status === 'unconfigured') {
        const fields: CloudFocus[] = ['url', 'key', 'save'];
        if (e.key === 'Tab') {
          e.preventDefault();
          const idx = fields.indexOf(cloud.focus as CloudFocus);
          const next = e.shiftKey ? (idx - 1 + fields.length) % fields.length : (idx + 1) % fields.length;
          setCloud(c => ({ ...c, focus: fields[next] }));
          return true;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const idx = fields.indexOf(cloud.focus as CloudFocus);
          if (idx > 0) setCloud(c => ({ ...c, focus: fields[idx - 1] }));
          return true;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const idx = fields.indexOf(cloud.focus as CloudFocus);
          if (idx < fields.length - 1) setCloud(c => ({ ...c, focus: fields[idx + 1] }));
          return true;
        }
        if (e.key === 'Enter' && cloud.focus === 'save') {
          e.preventDefault();
          cloudSaveAndConnect();
          return true;
        }
        // Let text input through for url/key fields
        return true;
      }

      if (cloud.status === 'connected') {
        const buttons: CloudFocus[] = ['sync', 'restore', 'backup', 'disconnect'];
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const idx = buttons.indexOf(cloud.focus as CloudFocus);
          if (idx > 0) setCloud(c => ({ ...c, focus: buttons[idx - 1] }));
          return true;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const idx = buttons.indexOf(cloud.focus as CloudFocus);
          if (idx < buttons.length - 1) setCloud(c => ({ ...c, focus: buttons[idx + 1] }));
          return true;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (cloud.focus === 'sync') cloudDoSync();
          else if (cloud.focus === 'restore') setCloud(c => ({ ...c, status: 'confirming-restore', message: '', messageType: '' }));
          else if (cloud.focus === 'backup') cloudBrowseBackups();
          else if (cloud.focus === 'disconnect') cloudDisconnect();
          return true;
        }
      }
      return true;
    }
    return true;
  }, [settingsOpen, settingsCategory, settingsThemeIndex, applyAndClose, toggleHardcore, trashRetentionIndex, cloud, cloudSaveAndConnect, cloudDoSync, cloudDoRestore, cloudDisconnect, cloudBrowseBackups, cloudRestoreSnapshot]);

  const setCloudField = useCallback((field: 'url' | 'serviceKey', value: string): void => {
    setCloud(c => ({ ...c, [field]: value }));
  }, []);

  const setCategory = useCallback((category: SettingsCategory): void => {
    setSettingsCategory(category);
    if (category === 'Cloud Sync') {
      setCloud(c => ({ ...c, focus: c.status === 'connected' ? 'sync' : 'url' }));
    }
  }, []);

  const setCloudFocus = useCallback((focus: CloudFocus): void => {
    setCloud(c => ({ ...c, focus }));
  }, []);

  const cloudConfirmRestore = useCallback((): void => {
    setCloud(c => ({ ...c, status: 'confirming-restore', message: '', messageType: '' }));
  }, []);

  const cloudConfirmBackupRestore = useCallback((): void => {
    setCloud(c => ({ ...c, status: 'confirming-backup-restore' }));
  }, []);

  return [
    { settingsOpen, settingsThemeIndex, themes: THEMES, hardcoreMode, settingsCategory, trashRetentionIndex, retentionOptions: RETENTION_OPTIONS, cloud },
    { open, handleKeyDown, setCloudField, setCategory, setThemeIndex: setSettingsThemeIndex, toggleHardcore, setTrashRetentionIndex, setCloudFocus,
      cloudSave: cloudSaveAndConnect, cloudSync: cloudDoSync, cloudConfirmRestore, cloudDisconnect, cloudBrowseBackups, cloudConfirmBackupRestore }
  ];
}
