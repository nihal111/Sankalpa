import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { setupMockApi } from './test-utils';

beforeEach(() => {
  setupMockApi();
});

describe('App settings', () => {
  it('Cmd+, opens settings modal', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('Esc closes settings modal', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    expect(screen.getByText('Settings')).toBeDefined();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Settings')).toBeNull();
  });

  it('arrow keys navigate theme options in settings', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    const themeCards = document.querySelectorAll('.theme-card');
    // Default theme is 'system' (index 2)
    expect(themeCards[2]?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(themeCards[2]?.classList.contains('selected')).toBe(false);
    expect(themeCards[1]?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(themeCards[0]?.classList.contains('selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(themeCards[1]?.classList.contains('selected')).toBe(true);
  });

  it('Enter applies selected theme and closes settings', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    // Navigate from system (2) to dark (1)
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.queryByText('Settings')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('ignores unhandled keys in settings modal', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    expect(screen.getByText('Settings')).toBeDefined();
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'x' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('loads persisted settings from DB on mount', async () => {
    setupMockApi({ settingsGetAll: () => Promise.resolve({ theme: 'light', hardcore_mode: '0' }) });
    render(<App />);
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('light'));
    expect(document.documentElement.classList.contains('hardcore')).toBe(false);
  });

  it('arrow up/down navigates settings categories', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    expect(document.querySelector('.settings-category.selected')?.textContent).toBe('Theme');
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(document.querySelector('.settings-category.selected')?.textContent).toBe('Hardcore');
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(document.querySelector('.settings-category.selected')?.textContent).toBe('Theme');
  });

  it('Enter toggles hardcore mode in Hardcore category', async () => {
    setupMockApi({ settingsGetAll: () => Promise.resolve({ hardcore_mode: '1' }) });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // Go to Hardcore
    expect(document.querySelector('.toggle')?.classList.contains('on')).toBe(true);
    fireEvent.keyDown(window, { key: 'Enter' }); // Toggle off
    expect(document.querySelector('.toggle')?.classList.contains('on')).toBe(false);
  });

  it('Space toggles hardcore mode in Hardcore category', async () => {
    setupMockApi({ settingsGetAll: () => Promise.resolve({ hardcore_mode: '0' }) });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // Go to Hardcore
    expect(document.querySelector('.toggle')?.classList.contains('on')).toBe(false);
    fireEvent.keyDown(window, { key: ' ' }); // Toggle on with Space
    expect(document.querySelector('.toggle')?.classList.contains('on')).toBe(true);
  });

  it('does not navigate past first/last category', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    // Try to go up from Theme (first)
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(document.querySelector('.settings-category.selected')?.textContent).toBe('Theme');
    // Go to Hardcore then try to go down
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // Should stay on Hardcore
    expect(document.querySelector('.settings-category.selected')?.textContent).toBe('Hardcore');
  });
});
