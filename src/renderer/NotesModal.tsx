import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { marked } from 'marked';

interface NotesModalProps {
  isOpen: boolean;
  initialValue: string;
  onCommit: (value: string) => void;
  onClose: () => void;
}

export function NotesModal({ isOpen, initialValue, onCommit, onClose }: NotesModalProps): ReactNode {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setMode('edit');
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [isOpen, initialValue]);

  useEffect(() => {
    if (isOpen && mode === 'preview') modalRef.current?.focus();
    else if (isOpen && mode === 'edit') textareaRef.current?.focus();
  }, [isOpen, mode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); onCommit(value); }
    else if (e.key === 'p' && e.metaKey) { e.preventDefault(); setMode(m => m === 'edit' ? 'preview' : 'edit'); }
  }, [onClose, onCommit, value]);

  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      e.preventDefault();
      const href = (target as HTMLAnchorElement).href;
      if (href) window.api.openExternal(href);
    }
  }, []);

  const renderedNotes = useMemo(() => {
    if (!value) return '';
    return marked.parse(value, { async: false }) as string;
  }, [value]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={modalRef} className="notes-modal" tabIndex={-1} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="notes-modal-header">
          <div className="notes-modal-tabs">
            <button className={`notes-modal-tab${mode === 'edit' ? ' active' : ''}`} onClick={() => setMode('edit')}>Edit</button>
            <button className={`notes-modal-tab${mode === 'preview' ? ' active' : ''}`} onClick={() => setMode('preview')}>Preview</button>
          </div>
          <div className="notes-modal-hints">
            <span><span className="hotkey-badge">⌘</span><span className="hotkey-badge">P</span> toggle</span>
            <span><span className="hotkey-badge">⌘</span><span className="hotkey-badge">↵</span> save</span>
            <span><span className="hotkey-badge">esc</span> cancel</span>
          </div>
        </div>
        {mode === 'edit' ? (
          <textarea
            ref={textareaRef}
            className="notes-modal-textarea"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Write notes in markdown..."
          />
        ) : (
          <div className="notes-modal-preview notes-rendered" onClick={handlePreviewClick} dangerouslySetInnerHTML={{ __html: renderedNotes }} />
        )}
      </div>
    </div>
  );
}
