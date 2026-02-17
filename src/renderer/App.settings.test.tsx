import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { setupMockApi, navigateToUserList, navigateToTasksPane } from './test-utils';

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
});
