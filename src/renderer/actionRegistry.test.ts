import { describe, it, expect } from 'vitest';
import { matchesHotkey, actions } from './actionRegistry';

describe('matchesHotkey', () => {
  const deleteAction = actions.find(a => a.id === 'delete')!;

  it('matches Delete key for backspace action', () => {
    const event = { key: 'Delete', metaKey: false, shiftKey: false, ctrlKey: false, altKey: false, code: 'Delete' } as KeyboardEvent;
    expect(matchesHotkey(event, deleteAction)).toBe(true);
  });
});
