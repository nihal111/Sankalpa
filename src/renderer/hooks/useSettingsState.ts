import { useEffect, useState, useCallback } from 'react';
import type { Theme } from './types';

const THEMES: Theme[] = ['light', 'dark', 'system'];

export interface SettingsActions {
  open: () => void;
  handleKeyDown: (e: KeyboardEvent) => boolean;
}

export function useSettingsState(): [
  { settingsOpen: boolean; settingsThemeIndex: number; themes: Theme[]; hardcoreMode: boolean },
  SettingsActions
] {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [hardcoreMode, setHardcoreMode] = useState(true);
  const [settingsThemeIndex, setSettingsThemeIndex] = useState(0);

  // Load settings from DB on mount
  useEffect(() => {
    window.api.settingsGetAll().then((settings: Record<string, string>) => {
      if (settings.theme && THEMES.includes(settings.theme as Theme)) {
        setTheme(settings.theme as Theme);
      }
      if (settings.hardcore_mode !== undefined) {
        setHardcoreMode(settings.hardcore_mode === '1');
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
    setSettingsThemeIndex(THEMES.indexOf(theme));
  }, [theme]);

  const applySettings = useCallback((newTheme: Theme, newHardcore: boolean) => {
    setTheme(newTheme);
    setHardcoreMode(newHardcore);
    window.api.settingsSet('theme', newTheme);
    window.api.settingsSet('hardcore_mode', newHardcore ? '1' : '0');
    setSettingsOpen(false);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    if (!settingsOpen) return false;
    if (e.key === 'Escape') { e.preventDefault(); setSettingsOpen(false); return true; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setSettingsThemeIndex((i) => Math.max(0, i - 1)); return true; }
    if (e.key === 'ArrowRight') { e.preventDefault(); setSettingsThemeIndex((i) => Math.min(THEMES.length - 1, i + 1)); return true; }
    if (e.key === 'Enter') { e.preventDefault(); applySettings(THEMES[settingsThemeIndex], hardcoreMode); return true; }
    return true;
  }, [settingsOpen, settingsThemeIndex, hardcoreMode, applySettings]);

  return [
    { settingsOpen, settingsThemeIndex, themes: THEMES, hardcoreMode },
    { open, handleKeyDown }
  ];
}
