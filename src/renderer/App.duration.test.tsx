import { render, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { setupMockApi, navigateToTasksPane } from './test-utils';

beforeEach(() => {
  setupMockApi();
});

describe('Duration feature', () => {
  it('Alt+D opens duration modal', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'd', altKey: true, code: 'KeyD' });
    await waitFor(() => expect(document.querySelector('.duration-modal')).not.toBeNull());
  });
});
