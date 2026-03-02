import { useEffect, useState, useCallback } from 'react';
import type { Theme } from '../types';
import { parseRetentionDays } from '../../shared/trashRetention';

const THEMES: Theme[] = ['light', 'dark', 'system'];
const CATEGORIES = ['Theme', 'Hardcore', 'Trash'] as const;
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
}

export function useSettingsState(): [
  { settingsOpen: boolean; settingsThemeIndex: number; themes: Theme[]; hardcoreMode: boolean; settingsCategory: SettingsCategory; trashRetentionIndex: number; retentionOptions: typeof RETENTION_OPTIONS },
  SettingsActions
] {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<SettingsCategory>('Theme');
  const [theme, setTheme] = useState<Theme>('system');
  const [hardcoreMode, setHardcoreMode] = useState(false);
  const [settingsThemeIndex, setSettingsThemeIndex] = useState(0);
  const [trashRetentionIndex, setTrashRetentionIndex] = useState(0);

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

  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    if (!settingsOpen) return false;
    if (e.key === 'Escape') { e.preventDefault(); setSettingsOpen(false); return true; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = CATEGORIES.indexOf(settingsCategory);
      if (idx > 0) setSettingsCategory(CATEGORIES[idx - 1]);
      return true;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = CATEGORIES.indexOf(settingsCategory);
      if (idx < CATEGORIES.length - 1) setSettingsCategory(CATEGORIES[idx + 1]);
      return true;
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
    return true;
  }, [settingsOpen, settingsCategory, applyAndClose, toggleHardcore, trashRetentionIndex]);

  return [
    { settingsOpen, settingsThemeIndex, themes: THEMES, hardcoreMode, settingsCategory, trashRetentionIndex, retentionOptions: RETENTION_OPTIONS },
    { open, handleKeyDown }
  ];
}
