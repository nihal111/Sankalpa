import type { ReactNode } from 'react';
import { useAppState } from './useAppState';
import { Sidebar } from './Sidebar';
import { TasksPane } from './TasksPane';
import { TaskDetailPane } from './TaskDetailPane';
import { SettingsModal } from './SettingsModal';
import { ConfirmationDialog } from './ConfirmationDialog';
import { SearchModal } from './SearchModal';

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
        dueDateIndex={state.focusedPane === 'lists' || !state.selectedTask ? state.dueDateIndex : null}
        onDueDateCommit={state.commitDueDate}
        showSourceList={state.isTrashView}
        lists={state.lists}
        completedFilter={state.completedFilter}
        onFilterChange={state.onFilterChange}
        listsWithCompletedTasks={state.listsWithCompletedTasks}
      />
      <TaskDetailPane
        task={state.focusedPane !== 'lists' ? state.selectedTask : null}
        focusedPane={state.focusedPane}
        onEditTitle={state.handleDetailEditTitle}
        onEditDueDate={state.handleDetailEditDueDate}
        dueDateEditing={state.dueDateIndex === state.selectedTaskIndex && state.selectedTask !== null}
        onDueDateCommit={state.commitDueDate}
        notesEditing={state.notesEditing}
        onStartNotesEdit={state.handleStartNotesEdit}
        onNotesCommit={state.handleNotesCommit}
        onNotesCancelEdit={state.handleNotesCancelEdit}
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
      <SearchModal
        isOpen={state.isSearchOpen}
        lastQuery={state.lastSearchQuery}
        onClose={state.closeSearch}
        onSelectTask={state.handleSearchSelect}
        onQueryChange={state.setLastSearchQuery}
      />
    </div>
  );
}
