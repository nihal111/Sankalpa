import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';
import { setupMockApi } from './test-utils';

function openSettingsToCloudSync(): void {
  fireEvent.keyDown(window, { key: ',', metaKey: true });
  fireEvent.keyDown(window, { key: 'ArrowDown' }); // Hardcore
  fireEvent.keyDown(window, { key: 'ArrowDown' }); // Trash
  fireEvent.keyDown(window, { key: 'ArrowDown' }); // Cloud Sync
}

beforeEach(() => {
  setupMockApi();
});

describe('Cloud Sync settings', () => {
  it('shows onboarding form when unconfigured', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    expect(document.querySelector('.settings-category.selected')?.textContent).toBe('Cloud Sync');
    expect(screen.getByPlaceholderText('https://xxx.supabase.co')).toBeDefined();
    expect(screen.getByPlaceholderText('eyJ...')).toBeDefined();
    expect(screen.getByText('Save & Connect')).toBeDefined();
  });

  it('clicking category navigates to it', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    fireEvent.keyDown(window, { key: ',', metaKey: true });
    expect(document.querySelector('.settings-category.selected')?.textContent).toBe('Theme');
    const categories = document.querySelectorAll('.settings-category');
    fireEvent.click(categories[3]); // Cloud Sync
    expect(document.querySelector('.settings-category.selected')?.textContent).toBe('Cloud Sync');
    fireEvent.click(categories[1]); // Hardcore
    expect(document.querySelector('.settings-category.selected')?.textContent).toBe('Hardcore');
  });

  it('Tab cycles through URL, Key, and Save fields', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    const urlInput = screen.getByPlaceholderText('https://xxx.supabase.co');
    expect(urlInput.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'Tab' });
    const keyInput = screen.getByPlaceholderText('eyJ...');
    expect(keyInput.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.querySelector('.cloud-button.focused')).toBeDefined();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(urlInput.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.querySelector('.cloud-button.focused')).toBeDefined();
  });

  it('typing in URL and Key fields updates values', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    const urlInput = screen.getByPlaceholderText('https://xxx.supabase.co') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://test.supabase.co' } });
    expect(urlInput.value).toBe('https://test.supabase.co');
    fireEvent.keyDown(window, { key: 'Tab' });
    const keyInput = screen.getByPlaceholderText('eyJ...') as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: 'my-secret-key' } });
    expect(keyInput.value).toBe('my-secret-key');
  });

  it('shows error when saving with empty fields', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    fireEvent.keyDown(window, { key: 'Tab' }); // key
    fireEvent.keyDown(window, { key: 'Tab' }); // save
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('Both fields are required')).toBeDefined());
  });

  it('calls testConnection and transitions to connected on success', async () => {
    const testConn = vi.fn().mockResolvedValue({ success: true, message: 'Connected' });
    const settingsSet = vi.fn().mockResolvedValue(undefined);
    setupMockApi({ cloudTestConnection: testConn, settingsSet });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    const urlInput = screen.getByPlaceholderText('https://xxx.supabase.co');
    const keyInput = screen.getByPlaceholderText('eyJ...');
    fireEvent.change(urlInput, { target: { value: 'https://test.supabase.co' } });
    fireEvent.change(keyInput, { target: { value: 'my-key' } });
    fireEvent.keyDown(window, { key: 'Tab' }); // key
    fireEvent.keyDown(window, { key: 'Tab' }); // save
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(testConn).toHaveBeenCalledWith('https://test.supabase.co', 'my-key'));
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    expect(screen.getByText('▲ Sync to Cloud')).toBeDefined();
    expect(screen.getByText('▼ Restore from Cloud')).toBeDefined();
    expect(screen.getByText('✕ Disconnect')).toBeDefined();
  });

  it('shows connected state when credentials exist in settings', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({
        supabase_url: 'https://existing.supabase.co',
        supabase_service_role_key: 'existing-key',
      }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
  });

  it('arrow keys navigate between Sync, Restore, Disconnect buttons', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({
        supabase_url: 'https://test.supabase.co',
        supabase_service_role_key: 'key',
      }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    // Wait for settings to load and cloud state to become connected
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    // Default focus is on Sync — re-enter Cloud Sync to reset focus
    fireEvent.keyDown(window, { key: 'ArrowUp' }); // go to Trash
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // back to Cloud Sync, focus resets to sync
    const buttons = document.querySelectorAll('.cloud-button');
    expect(buttons[0]?.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(buttons[1]?.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(buttons[2]?.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(buttons[1]?.classList.contains('focused')).toBe(true);
  });

  it('Enter on Sync calls cloudSync', async () => {
    const syncFn = vi.fn().mockResolvedValue({ success: true, message: '36 tasks, 4 lists' });
    setupMockApi({
      settingsGetAll: () => Promise.resolve({
        supabase_url: 'https://test.supabase.co',
        supabase_service_role_key: 'key',
      }),
      cloudSync: syncFn,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // reset focus to sync
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(syncFn).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('✓ Synced 36 tasks, 4 lists')).toBeDefined());
  });

  it('Enter on Restore shows confirmation, Esc cancels', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({
        supabase_url: 'https://test.supabase.co',
        supabase_service_role_key: 'key',
      }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // reset focus to sync
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // Restore
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText('This will replace your local database with cloud data.')).toBeDefined();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByText('Connected to Supabase')).toBeDefined();
  });

  it('Enter on Restore confirmation calls cloudRestore', async () => {
    const restoreFn = vi.fn().mockResolvedValue({ success: true, message: '36 tasks' });
    setupMockApi({
      settingsGetAll: () => Promise.resolve({
        supabase_url: 'https://test.supabase.co',
        supabase_service_role_key: 'key',
      }),
      cloudRestore: restoreFn,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // reset focus to sync
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // Restore
    fireEvent.keyDown(window, { key: 'Enter' }); // Show confirmation
    fireEvent.keyDown(window, { key: 'Enter' }); // Confirm
    await waitFor(() => expect(restoreFn).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('✓ Restored 36 tasks')).toBeDefined());
  });

  it('Disconnect clears credentials and returns to onboarding', async () => {
    const settingsSet = vi.fn().mockResolvedValue(undefined);
    setupMockApi({
      settingsGetAll: () => Promise.resolve({
        supabase_url: 'https://test.supabase.co',
        supabase_service_role_key: 'key',
      }),
      settingsSet,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // reset focus to sync
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // Restore
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // Backup
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // Disconnect
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(screen.getByPlaceholderText('https://xxx.supabase.co')).toBeDefined());
    expect(settingsSet).toHaveBeenCalledWith('supabase_url', '');
    expect(settingsSet).toHaveBeenCalledWith('supabase_service_role_key', '');
  });

  it('shows error when testConnection fails', async () => {
    const testConn = vi.fn().mockResolvedValue({ success: false, message: 'Invalid URL' });
    setupMockApi({ cloudTestConnection: testConn });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    const urlInput = screen.getByPlaceholderText('https://xxx.supabase.co');
    const keyInput = screen.getByPlaceholderText('eyJ...');
    fireEvent.change(urlInput, { target: { value: 'https://bad.supabase.co' } });
    fireEvent.change(keyInput, { target: { value: 'bad-key' } });
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('Invalid URL')).toBeDefined());
  });

  it('shows error when sync fails', async () => {
    const syncFn = vi.fn().mockResolvedValue({ success: false, message: 'Network error' });
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
      cloudSync: syncFn,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('✗ Network error')).toBeDefined());
  });

  it('shows error when restore fails', async () => {
    const restoreFn = vi.fn().mockResolvedValue({ success: false, message: 'Restore failed' });
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
      cloudRestore: restoreFn,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // Restore
    fireEvent.keyDown(window, { key: 'Enter' }); // confirm dialog
    fireEvent.keyDown(window, { key: 'Enter' }); // confirm
    await waitFor(() => expect(screen.getByText('✗ Restore failed')).toBeDefined());
  });

  it('clicking Sync button triggers sync', async () => {
    const syncFn = vi.fn().mockResolvedValue({ success: true, message: '10 tasks' });
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
      cloudSync: syncFn,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.click(screen.getByText('▲ Sync to Cloud'));
    await waitFor(() => expect(syncFn).toHaveBeenCalled());
  });

  it('clicking Restore button shows confirmation', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.click(screen.getByText('▼ Restore from Cloud'));
    expect(screen.getByText('This will replace your local database with cloud data.')).toBeDefined();
  });

  it('clicking Disconnect clears credentials', async () => {
    const settingsSet = vi.fn().mockResolvedValue(undefined);
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
      settingsSet,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.click(screen.getByText('✕ Disconnect'));
    await waitFor(() => expect(screen.getByPlaceholderText('https://xxx.supabase.co')).toBeDefined());
  });

  it('blocks keyboard input during loading state', async () => {
    let resolveSync: (v: { success: boolean; message: string }) => void;
    const syncFn = vi.fn().mockImplementation(() => new Promise(r => { resolveSync = r; }));
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
      cloudSync: syncFn,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' }); // start sync
    await waitFor(() => expect(screen.getByText('Syncing...')).toBeDefined());
    // While loading, arrow keys should be blocked
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByText('Syncing...')).toBeDefined();
    resolveSync!({ success: true, message: 'done' });
    await waitFor(() => expect(screen.getByText('✓ Synced done')).toBeDefined());
  });

  it('ArrowUp/Down navigates fields in unconfigured state', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    const urlInput = screen.getByPlaceholderText('https://xxx.supabase.co');
    expect(urlInput.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const keyInput = screen.getByPlaceholderText('eyJ...');
    expect(keyInput.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(document.querySelector('.cloud-button.focused')).toBeDefined();
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(keyInput.classList.contains('focused')).toBe(true);
    // ArrowUp at top stays at top
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(urlInput.classList.contains('focused')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(urlInput.classList.contains('focused')).toBe(true);
  });

  it('does not block Cmd+V in cloud input fields', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    // Cmd+V should NOT be consumed by the settings handler (return false)
    const event = new KeyboardEvent('keydown', { key: 'v', metaKey: true, bubbles: true });
    window.dispatchEvent(event);
    // Settings modal should still be open (not closed or disrupted)
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByPlaceholderText('https://xxx.supabase.co')).toBeDefined();
  });

  it('Restore from Backup shows snapshot list', async () => {
    const snapshots = [
      { id: 's1', tier: 'daily', created_at: new Date('2026-03-07T10:00:00').getTime() },
      { id: 's2', tier: 'weekly', created_at: new Date('2026-03-01T09:00:00').getTime() },
    ];
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
      cloudListSnapshots: vi.fn().mockResolvedValue({ result: { success: true, message: '2 backups' }, snapshots }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.click(screen.getByText('⟲ Restore from Backup'));
    await waitFor(() => expect(screen.getByText('Select a backup to restore')).toBeDefined());
    expect(document.querySelectorAll('.cloud-backup-item')).toHaveLength(2);
    expect(document.querySelector('.cloud-backup-item.selected')).toBeDefined();
    expect(screen.getByText('daily')).toBeDefined();
    expect(screen.getByText('weekly')).toBeDefined();
  });

  it('keyboard navigates snapshots and restores selected', async () => {
    const snapshots = [
      { id: 's1', tier: 'daily', created_at: 1000 },
      { id: 's2', tier: 'weekly', created_at: 2000 },
    ];
    const restoreSnap = vi.fn().mockResolvedValue({ success: true, message: '10 tasks' });
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
      cloudListSnapshots: vi.fn().mockResolvedValue({ result: { success: true, message: '2 backups' }, snapshots }),
      cloudRestoreSnapshot: restoreSnap,
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    // Navigate to Backup button via keyboard
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // sync
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // restore
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // backup
    fireEvent.keyDown(window, { key: 'Enter' }); // browse backups
    await waitFor(() => expect(screen.getByText('Select a backup to restore')).toBeDefined());
    // First item selected by default, navigate down
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const items = document.querySelectorAll('.cloud-backup-item');
    expect(items[1]?.classList.contains('selected')).toBe(true);
    // Enter to confirm
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText(/Restore backup from/)).toBeDefined();
    // Confirm restore
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(restoreSnap).toHaveBeenCalledWith('s2'));
    await waitFor(() => expect(screen.getByText('✓ Restored 10 tasks')).toBeDefined());
  });

  it('Esc from backup list returns to connected state', async () => {
    const snapshots = [{ id: 's1', tier: 'daily', created_at: 1000 }];
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
      cloudListSnapshots: vi.fn().mockResolvedValue({ result: { success: true, message: '1 backups' }, snapshots }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.click(screen.getByText('⟲ Restore from Backup'));
    await waitFor(() => expect(screen.getByText('Select a backup to restore')).toBeDefined());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByText('Connected to Supabase')).toBeDefined();
  });

  it('Esc from backup restore confirmation returns to connected state', async () => {
    const snapshots = [{ id: 's1', tier: 'daily', created_at: 1000 }];
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
      cloudListSnapshots: vi.fn().mockResolvedValue({ result: { success: true, message: '1 backups' }, snapshots }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.click(screen.getByText('⟲ Restore from Backup'));
    await waitFor(() => expect(screen.getByText('Select a backup to restore')).toBeDefined());
    fireEvent.keyDown(window, { key: 'Enter' }); // confirm dialog
    expect(screen.getByText(/Restore backup from/)).toBeDefined();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByText('Connected to Supabase')).toBeDefined();
  });

  it('shows message when no backups exist', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
      cloudListSnapshots: vi.fn().mockResolvedValue({ result: { success: true, message: '0 backups' }, snapshots: [] }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.click(screen.getByText('⟲ Restore from Backup'));
    await waitFor(() => expect(screen.getByText('No backups yet — backups are created automatically when you sync')).toBeDefined());
  });

  it('shows error when listing backups fails', async () => {
    setupMockApi({
      settingsGetAll: () => Promise.resolve({ supabase_url: 'https://x.supabase.co', supabase_service_role_key: 'k' }),
      cloudListSnapshots: vi.fn().mockResolvedValue({ result: { success: false, message: 'Network error' }, snapshots: [] }),
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText('Work')).toBeDefined());
    openSettingsToCloudSync();
    await waitFor(() => expect(screen.getByText('Connected to Supabase')).toBeDefined());
    fireEvent.click(screen.getByText('⟲ Restore from Backup'));
    await waitFor(() => expect(screen.getByText('✗ Network error')).toBeDefined());
  });
});
