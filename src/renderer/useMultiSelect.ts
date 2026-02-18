import { useState, useCallback, useEffect } from 'react';

interface MultiSelectState {
  selectedIndices: Set<number>;
  selectionAnchor: number | null;
  boundaryCursor: number | null;
  shiftHeld: boolean;
  cmdHeld: boolean;
}

interface MultiSelectActions {
  clear: () => void;
  handleShiftDown: (currentIndex: number) => void;
  handleShiftUp: () => void;
  handleCmdDown: (currentIndex: number) => void;
  handleCmdUp: () => number | null;
  toggleAtCursor: (currentIndex: number) => void;
  extendSelection: (anchorIndex: number, newIndex: number) => void;
  moveBoundaryCursor: (newIndex: number) => void;
}

export function useMultiSelect(): [MultiSelectState, MultiSelectActions] {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  const [boundaryCursor, setBoundaryCursor] = useState<number | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [cmdHeld, setCmdHeld] = useState(false);

  const clear = useCallback(() => {
    setSelectedIndices(new Set());
    setSelectionAnchor(null);
    setBoundaryCursor(null);
  }, []);

  const handleShiftDown = useCallback((currentIndex: number) => {
    setShiftHeld(true);
    setSelectionAnchor((prev) => prev ?? currentIndex);
  }, []);

  const handleShiftUp = useCallback(() => {
    setShiftHeld(false);
  }, []);

  const [cmdStartIndex, setCmdStartIndex] = useState<number | null>(null);

  const handleCmdDown = useCallback((currentIndex: number) => {
    setCmdHeld(true);
    setBoundaryCursor(currentIndex);
    setCmdStartIndex(currentIndex);
    setSelectedIndices((prev) => new Set(prev).add(currentIndex));
  }, []);

  const handleCmdUp = useCallback((): number | null => {
    setCmdHeld(false);
    const cursor = boundaryCursor;
    const didMove = cursor !== null && cursor !== cmdStartIndex;
    setBoundaryCursor(null);
    setCmdStartIndex(null);
    return didMove ? cursor : null;
  }, [boundaryCursor, cmdStartIndex]);

  const toggleAtCursor = useCallback((currentIndex: number) => {
    const targetIdx = boundaryCursor !== null ? boundaryCursor : currentIndex;
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(targetIdx)) {
        next.delete(targetIdx);
      } else {
        next.add(targetIdx);
      }
      return next;
    });
  }, [boundaryCursor]);

  const extendSelection = useCallback((anchorIndex: number, newIndex: number) => {
    const minIdx = Math.min(anchorIndex, newIndex);
    const maxIdx = Math.max(anchorIndex, newIndex);
    const newSelection = new Set<number>();
    for (let i = minIdx; i <= maxIdx; i++) {
      newSelection.add(i);
    }
    setSelectedIndices(newSelection);
  }, []);

  const moveBoundaryCursor = useCallback((newIndex: number) => {
    setBoundaryCursor(newIndex);
  }, []);

  // Clear selection when releasing Shift/Cmd with only one item
  useEffect(() => {
    if (!shiftHeld && !cmdHeld && selectedIndices.size === 1) {
      setSelectedIndices(new Set());
      setSelectionAnchor(null);
    }
  }, [shiftHeld, cmdHeld, selectedIndices.size]);

  const state: MultiSelectState = {
    selectedIndices,
    selectionAnchor,
    boundaryCursor,
    shiftHeld,
    cmdHeld,
  };

  const actions: MultiSelectActions = {
    clear,
    handleShiftDown,
    handleShiftUp,
    handleCmdDown,
    handleCmdUp,
    toggleAtCursor,
    extendSelection,
    moveBoundaryCursor,
  };

  return [state, actions];
}
