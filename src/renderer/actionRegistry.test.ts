import { describe, it, expect } from 'vitest';
import { matchesHotkey, actions } from './actionRegistry';

describe('matchesHotkey', () => {
  const deleteAction = actions.find(a => a.id === 'delete')!;
  const newTaskBelowAction = actions.find(a => a.id === 'newTaskBelow')!;

  it('matches Delete key for backspace action', () => {
    const event = { key: 'Delete', metaKey: false, shiftKey: false, ctrlKey: false, altKey: false, code: 'Delete' } as KeyboardEvent;
    expect(matchesHotkey(event, deleteAction)).toBe(true);
  });

  it('matches Cmd+Opt+N using event code when alt modifies key output', () => {
    const event = { key: '˜', metaKey: true, shiftKey: false, ctrlKey: false, altKey: true, code: 'KeyN' } as KeyboardEvent;
    expect(matchesHotkey(event, newTaskBelowAction)).toBe(true);
  });
});
