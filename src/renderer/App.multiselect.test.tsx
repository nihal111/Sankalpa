import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { setupMockApi, navigateToUserList, navigateToTasksPane } from './test-utils';

beforeEach(() => {
  setupMockApi();
});

describe('App multi-select', () => {
  it('Shift+Arrow extends selection continuously', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
  });

  it('Shift+Arrow contracts selection when moving back toward anchor', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(false);
  });

  it('releasing Shift keeps multi-selection if more than one item', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Shift' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
  });

  it('releasing Shift clears selection if only one item', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyUp(window, { key: 'Shift' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
  });

  it('Cmd shows cursor and selects current item', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Meta' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('cursor')).toBe(true);
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
  });

  it('Cmd+Arrow moves cursor without selecting', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Meta' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('cursor')).toBe(false);
    expect(taskItems[1]?.classList.contains('cursor')).toBe(true);
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(false);
  });

  it('Cmd+Enter toggles selection at cursor', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Meta' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
  });

  it('releasing Cmd hides cursor but keeps selection', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Meta' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyUp(window, { key: 'Meta' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('cursor')).toBe(false);
    expect(taskItems[1]?.classList.contains('cursor')).toBe(false);
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
  });

  it('Space without Cmd clears selection', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Shift' });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    fireEvent.keyDown(window, { key: ' ' });
    taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
  });

  it('Arrow without modifier clears selection', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Shift' });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
  });

  it('Esc clears selection', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Shift' });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
  });

  it('Cmd+Space does nothing when boundaryCursor is null', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: ' ', metaKey: true });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
  });

  it('releasing Cmd with multiple items keeps selection until arrow without modifier', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Meta' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyUp(window, { key: 'Meta' });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(false);
  });

  it('single item selection clears when modifier released', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Meta' });
    fireEvent.keyUp(window, { key: 'Meta' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
  });

  it('Shift in lists pane does not trigger multi-select', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const listItems = document.querySelectorAll('.lists-pane .item');
    for (const item of listItems) {
      expect(item.classList.contains('multi-selected')).toBe(false);
    }
  });

  it('Meta in lists pane does not trigger multi-select', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'Meta' });
    const listItems = document.querySelectorAll('.lists-pane .item');
    for (const item of listItems) {
      expect(item.classList.contains('cursor')).toBe(false);
    }
  });

  it('Shift+Arrow selects multiple then releasing keeps selection', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Shift' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
  });

  it('Cmd+Return when not in tasks pane does nothing', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'Meta' });
    fireEvent.keyDown(window, { key: 'Enter' });
    const listItems = document.querySelectorAll('.lists-pane .item');
    for (const item of listItems) {
      expect(item.classList.contains('multi-selected')).toBe(false);
    }
  });

  it('Tab clears selection when switching panes', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Shift' });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'Tab' });
    taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
  });

  it('Cmd+Arrow clamps at list boundaries', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Meta' });
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[1]?.classList.contains('cursor')).toBe(true);
  });

  it('Shift+Arrow clamps at list boundaries', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    }
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
  });

  it('Cmd hides selected highlight, shows only cursor and multi-selected', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Meta' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('selected')).toBe(false);
    expect(taskItems[0]?.classList.contains('cursor')).toBe(true);
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
  });

  it('releasing Cmd moves cursor to boundaryCursor position', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Meta' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Meta' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[1]?.classList.contains('selected')).toBe(true);
  });

  it('Cmd+Enter toggles item off from selection', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Meta' });
    fireEvent.keyDown(window, { key: 'Enter' });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
    fireEvent.keyDown(window, { key: 'Enter' });
    taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
  });

  it('Space clears multi-selection', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Shift' });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
    fireEvent.keyDown(window, { key: ' ' });
    taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(false);
  });

  it('Shift keydown does not auto-add to selection', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
  });

  it('handles Meta keyup without prior keydown', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyUp(window, { key: 'Meta' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('selected')).toBe(true);
  });
});
