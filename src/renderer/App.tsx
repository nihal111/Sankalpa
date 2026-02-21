import type { ReactNode } from 'react';
import { useAppState } from './useAppState';
import { Sidebar } from './Sidebar';
import { TasksPane } from './TasksPane';
import { SettingsModal } from './SettingsModal';
import { ConfirmationDialog } from './ConfirmationDialog';

export default function App(): ReactNode {
  const state = useAppState();

  return (
    <div className="app">
      <Sidebar
        sidebarItems={state.sidebarItems}
        selectedSidebarIndex={state.selectedSidebarIndex}
        focusedPane={state.focusedPane}
        moveMode={state.moveMode}
        moveTargetIndex={state.moveTargetIndex}
        editMode={state.editMode}
        editValue={state.editValue}
        setEditValue={state.setEditValue}
        setEditMode={state.setEditMode}
        handleInputKeyDown={state.handleInputKeyDown}
        inputRef={state.inputRef}
        taskCounts={state.taskCounts}
        onItemClick={state.handleSidebarClick}
        onFolderToggle={state.handleFolderToggle}
        flashIds={state.flashIds}
        trashIndex={state.trashIndex}
      />
      <TasksPane
        tasks={state.tasks}
        selectedTaskIndex={state.selectedTaskIndex}
        focusedPane={state.focusedPane}
        editMode={state.editMode}
        editValue={state.editValue}
        setEditValue={state.setEditValue}
        setEditMode={state.setEditMode}
        handleInputKeyDown={state.handleInputKeyDown}
        inputRef={state.inputRef}
        headerName={state.getSelectedListName()}
        selectedTaskIndices={state.selectedTaskIndices}
        shiftHeld={state.shiftHeld}
        cmdHeld={state.cmdHeld}
        boundaryCursor={state.boundaryCursor}
        onTaskClick={state.handleTaskClick}
        onTaskToggle={state.handleTaskToggle}
        flashIds={state.flashIds}
        listNames={state.isCompletedView ? state.listNames : undefined}
        dueDateIndex={state.dueDateIndex}
        onDueDateCommit={state.commitDueDate}
        showSourceList={state.isTrashView}
        lists={state.lists}
      />
      {state.moveMode && (
        <div className="move-overlay">
          <div className="move-hint">Move to: {state.getMoveTargetName()} (↑↓ to select, Enter to confirm, Esc to cancel)</div>
        </div>
      )}
      {state.settingsOpen && (
        <SettingsModal
          settingsThemeIndex={state.settingsThemeIndex}
          settingsCategory={state.settingsCategory}
          hardcoreMode={state.hardcoreMode}
        />
      )}
      {state.confirmationDialog && (
        <ConfirmationDialog
          title={state.confirmationDialog.title}
          message={state.confirmationDialog.message}
          options={state.confirmationDialog.options}
          onCancel={state.closeConfirmationDialog}
        />
      )}
    </div>
  );
}
