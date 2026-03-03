import { render, fireEvent } from '@testing-library/react';
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

  it('Ctrl shows cursor and selects current item', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('cursor')).toBe(true);
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
  });

  it('Ctrl+Arrow moves cursor without selecting', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('cursor')).toBe(false);
    expect(taskItems[1]?.classList.contains('cursor')).toBe(true);
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(false);
  });

  it('Ctrl+Enter toggles selection at cursor', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
  });

  it('releasing Ctrl hides cursor but keeps selection', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyUp(window, { key: 'Control', ctrlKey: false });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('cursor')).toBe(false);
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

  it('Ctrl+Space does nothing when boundaryCursor is null', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: ' ', ctrlKey: true });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
  });

  it('releasing Ctrl with multiple items keeps selection until arrow without modifier', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyUp(window, { key: 'Control', ctrlKey: false });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(false);
  });

  it('single item selection clears when Ctrl released', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    fireEvent.keyUp(window, { key: 'Control', ctrlKey: false });
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

  it('Control in lists pane does not trigger multi-select', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
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

  it('Ctrl+Return when not in tasks pane does nothing', async () => {
    render(<App />);
    await navigateToUserList();
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Enter' });
    const listItems = document.querySelectorAll('.lists-pane .item');
    for (const item of listItems) {
      expect(item.classList.contains('multi-selected')).toBe(false);
    }
  });

  it('ArrowLeft clears selection when switching panes', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Shift' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Shift' });
    let taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(false);
  });

  it('Ctrl+Arrow clamps at list boundaries', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
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

  it('Ctrl hides selected highlight, shows only cursor and multi-selected', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('selected')).toBe(false);
    expect(taskItems[0]?.classList.contains('cursor')).toBe(true);
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
  });

  it('releasing Ctrl moves cursor to boundaryCursor position', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyUp(window, { key: 'Control', ctrlKey: false });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[1]?.classList.contains('selected')).toBe(true);
  });

  it('Cmd+Enter toggles task completion on and off', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    expect(window.api.tasksToggleCompleted).toHaveBeenCalledWith('t1');
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
    expect(window.api.tasksToggleCompleted).toHaveBeenCalledTimes(2);
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
    fireEvent.keyUp(window, { key: 'Control', ctrlKey: false });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('selected')).toBe(true);
  });

  it('Cmd+Down jumps to last task', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[taskItems.length - 1]?.classList.contains('selected')).toBe(true);
  });

  it('Cmd+Up jumps to first task', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp', metaKey: true });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('selected')).toBe(true);
  });

  it('Cmd+Shift+Down selects from cursor to bottom', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true, shiftKey: true });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    for (let i = 0; i < taskItems.length; i++) {
      expect(taskItems[i]?.classList.contains('multi-selected')).toBe(true);
    }
  });

  it('Cmd+Shift+Up selects from cursor to top', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp', metaKey: true, shiftKey: true });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    expect(taskItems[0]?.classList.contains('multi-selected')).toBe(true);
    expect(taskItems[1]?.classList.contains('multi-selected')).toBe(true);
  });

  it('Cmd+A selects all tasks', async () => {
    render(<App />);
    await navigateToTasksPane();
    fireEvent.keyDown(window, { key: 'a', metaKey: true });
    const taskItems = document.querySelectorAll('.tasks-pane .item');
    for (let i = 0; i < taskItems.length; i++) {
      expect(taskItems[i]?.classList.contains('multi-selected')).toBe(true);
    }
  });
});
