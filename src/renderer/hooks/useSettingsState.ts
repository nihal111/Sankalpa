import { useEffect, useState, useCallback } from 'react';
import type { Theme } from './types';

const THEMES: Theme[] = ['light', 'dark', 'system'];

export interface SettingsActions {
  open: () => void;
  handleKeyDown: (e: KeyboardEvent) => boolean;
}

export function useSettingsState(): [
  { settingsOpen: boolean; settingsThemeIndex: number; themes: Theme[] },
  SettingsActions
] {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [settingsThemeIndex, setSettingsThemeIndex] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const open = useCallback(() => {
    setSettingsOpen(true);
    setSettingsThemeIndex(THEMES.indexOf(theme));
  }, [theme]);

  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    if (!settingsOpen) return false;
    if (e.key === 'Escape') { e.preventDefault(); setSettingsOpen(false); return true; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setSettingsThemeIndex((i) => Math.max(0, i - 1)); return true; }
    if (e.key === 'ArrowRight') { e.preventDefault(); setSettingsThemeIndex((i) => Math.min(THEMES.length - 1, i + 1)); return true; }
    if (e.key === 'Enter') { e.preventDefault(); setTheme(THEMES[settingsThemeIndex]); setSettingsOpen(false); return true; }
    return true;
  }, [settingsOpen, settingsThemeIndex]);

  return [
    { settingsOpen, settingsThemeIndex, themes: THEMES },
    { open, handleKeyDown }
  ];
}
