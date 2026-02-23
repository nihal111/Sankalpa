import type { ReactNode } from 'react';
import { useAppState } from './useAppState';
import { Sidebar } from './Sidebar';
import { TasksPane } from './TasksPane';
import { TaskDetailPane } from './TaskDetailPane';
import { ContextMenu } from './ContextMenu';
import { SettingsModal } from './SettingsModal';
import { ConfirmationDialog } from './ConfirmationDialog';
import { SearchModal } from './SearchModal';
import { DueDateModal } from './DueDateModal';
import { CommandPalette } from './CommandPalette';
import { ListInfoModal } from './ListInfoModal';
import { MoveListOverlay } from './MoveListOverlay';

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
        onItemContextMenu={state.handleSidebarContextMenu}
        onFolderToggle={state.handleFolderToggle}
        flashIds={state.flashIds}
        trashIndex={state.trashIndex}
        sidebarDropTarget={state.dragState.sidebarDropTarget}
        sidebarDropProps={state.sidebarDropProps}
        cmdHeld={state.cmdHeld}
      />
      <TasksPane
        tasks={state.tasks}
        flatTasks={state.flatTasks}
        selectedTaskIndex={state.selectedTaskIndex}
        focusedPane={state.focusedPane}
        editMode={state.editMode}
        editValue={state.editValue}
        setEditValue={state.setEditValue}
        setEditMode={state.setEditMode}
        handleInputKeyDown={state.handleInputKeyDown}
        handleEditBlur={state.handleEditBlur}
        inputRef={state.inputRef}
        headerName={state.getSelectedListName()}
        selectedTaskIndices={state.selectedTaskIndices}
        shiftHeld={state.shiftHeld}
        cmdHeld={state.cmdHeld}
        boundaryCursor={state.boundaryCursor}
        onTaskClick={state.handleTaskClick}
        onTaskContextMenu={state.handleTaskContextMenu}
        onTaskToggle={state.handleTaskToggle}
        flashIds={state.flashIds}
        throbIds={state.throbIds}
        completeIds={state.completeIds}
        uncompleteIds={state.uncompleteIds}
        moveIds={state.moveIds}
        evaporateIds={state.evaporateIds}
        listNames={state.isCompletedView ? state.listNames : undefined}
        showSourceList={state.isTrashView}
        lists={state.lists}
        completedFilter={state.completedFilter}
        onFilterChange={state.onFilterChange}
        listsWithCompletedTasks={state.listsWithCompletedTasks}
        dragOverIndex={state.dragState.dragOverIndex}
        dropPosition={state.dragState.dropPosition}
        taskDragProps={state.taskDragProps}
      />
      <TaskDetailPane
        task={state.focusedPane !== 'lists' ? state.selectedTask : null}
        focusedPane={state.focusedPane}
        onEditTitle={state.handleDetailEditTitle}
        onEditDueDate={state.handleDetailEditDueDate}
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
      {state.moveListMode && <MoveListOverlay targets={state.moveListTargets} targetIndex={state.moveListTargetIndex} />}
      {state.settingsOpen && (
        <SettingsModal
          settingsThemeIndex={state.settingsThemeIndex}
          settingsCategory={state.settingsCategory}
          hardcoreMode={state.hardcoreMode}
          trashRetentionIndex={state.trashRetentionIndex}
          retentionOptions={state.retentionOptions}
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
      <DueDateModal
        isOpen={state.dueDateIndex !== null}
        currentDueDate={state.selectedTask?.due_date ?? null}
        onCommit={state.commitDueDate}
        onClose={state.cancelDueDate}
      />
      {state.contextMenu && (
        <ContextMenu
          x={state.contextMenu.x}
          y={state.contextMenu.y}
          items={state.contextMenu.items}
          onClose={state.closeContextMenu}
        />
      )}
      <CommandPalette
        isOpen={state.isPaletteOpen}
        context={state.paletteContext}
        onClose={state.closePalette}
        onExecute={state.executePaletteAction}
      />
      <ListInfoModal isOpen={state.listInfoOpen} selectedSidebarItem={state.selectedSidebarItem} onClose={state.closeListInfo} />
    </div>
  );
}
