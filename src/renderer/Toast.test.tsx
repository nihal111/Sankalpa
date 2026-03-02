import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders message when provided', () => {
    render(<Toast message="Test message" />);
    expect(screen.getByText('Test message')).toBeDefined();
  });

  it('renders nothing when message is null', () => {
    const { container } = render(<Toast message={null} />);
    expect(container.firstChild).toBeNull();
  });
});
