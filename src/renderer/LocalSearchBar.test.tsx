import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocalSearchBar } from './LocalSearchBar';

describe('LocalSearchBar', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <LocalSearchBar isOpen={false} query="" onQueryChange={vi.fn()} onClose={vi.fn()} matchCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when open', () => {
    render(
      <LocalSearchBar isOpen={true} query="" onQueryChange={vi.fn()} onClose={vi.fn()} matchCount={5} />
    );
    expect(screen.getByPlaceholderText(/search in current list/i)).toBeDefined();
  });

  it('shows match count singular', () => {
    render(
      <LocalSearchBar isOpen={true} query="test" onQueryChange={vi.fn()} onClose={vi.fn()} matchCount={1} />
    );
    expect(screen.getByText('1 match')).toBeDefined();
  });

  it('shows match count plural', () => {
    render(
      <LocalSearchBar isOpen={true} query="test" onQueryChange={vi.fn()} onClose={vi.fn()} matchCount={3} />
    );
    expect(screen.getByText('3 matches')).toBeDefined();
  });

  it('calls onQueryChange when typing', () => {
    const onQueryChange = vi.fn();
    render(
      <LocalSearchBar isOpen={true} query="" onQueryChange={onQueryChange} onClose={vi.fn()} matchCount={0} />
    );
    const input = screen.getByPlaceholderText(/search in current list/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onQueryChange).toHaveBeenCalledWith('test');
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(
      <LocalSearchBar isOpen={true} query="" onQueryChange={vi.fn()} onClose={onClose} matchCount={0} />
    );
    const input = screen.getByPlaceholderText(/search in current list/i);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking close button', () => {
    const onClose = vi.fn();
    render(
      <LocalSearchBar isOpen={true} query="" onQueryChange={vi.fn()} onClose={onClose} matchCount={0} />
    );
    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose on other keys', () => {
    const onClose = vi.fn();
    render(
      <LocalSearchBar isOpen={true} query="" onQueryChange={vi.fn()} onClose={onClose} matchCount={0} />
    );
    const input = screen.getByPlaceholderText(/search in current list/i);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('focuses input when opened', async () => {
    const { rerender } = render(
      <LocalSearchBar isOpen={false} query="" onQueryChange={vi.fn()} onClose={vi.fn()} matchCount={0} />
    );
    rerender(
      <LocalSearchBar isOpen={true} query="" onQueryChange={vi.fn()} onClose={vi.fn()} matchCount={0} />
    );
    await new Promise(resolve => setTimeout(resolve, 10));
    const input = screen.getByPlaceholderText(/search in current list/i) as HTMLInputElement;
    expect(document.activeElement === input || input === document.activeElement).toBe(true);
  });
});
