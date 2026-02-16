import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders two panes', () => {
    render(<App />);
    expect(screen.getByText('Lists')).toBeDefined();
    expect(screen.getByText('Tasks')).toBeDefined();
  });
});
