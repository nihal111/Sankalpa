#!/bin/bash
# Sankalpa database backup/restore script

DB_PATH="$HOME/Library/Application Support/Sankalpa/sankalpa.db"
BACKUP_DIR="$HOME/.sankalpa-backups"

usage() {
  echo "Usage: $0 <command>"
  echo ""
  echo "Commands:"
  echo "  backup [name]   Create a backup (optional name, defaults to timestamp)"
  echo "  restore [name]  Restore from a backup (defaults to latest)"
  echo "  list            List available backups"
  echo ""
  echo "Examples:"
  echo "  $0 backup                # Creates backup with timestamp"
  echo "  $0 backup before-cleanup # Creates backup named 'before-cleanup'"
  echo "  $0 restore 2025-01-15_143022"
  echo "  $0 list"
}

backup() {
  if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database not found at $DB_PATH"
    exit 1
  fi

  mkdir -p "$BACKUP_DIR"
  
  local name="${1:-$(date +%Y-%m-%d_%H%M%S)}"
  local backup_file="$BACKUP_DIR/$name.db"
  
  if [ -f "$backup_file" ]; then
    echo "Error: Backup '$name' already exists"
    exit 1
  fi
  
  cp "$DB_PATH" "$backup_file"
  echo "Backed up to: $backup_file"
}

restore() {
  local name="$1"
  if [ -z "$name" ]; then
    name=$(ls -t "$BACKUP_DIR"/*.db 2>/dev/null | head -1 | xargs -I{} basename {} .db)
    if [ -z "$name" ]; then
      echo "Error: No backups found"
      exit 1
    fi
    echo "Using latest backup: $name"
  fi
  
  local backup_file="$BACKUP_DIR/$name.db"
  
  if [ ! -f "$backup_file" ]; then
    echo "Error: Backup '$1' not found"
    echo "Use '$0 list' to see available backups"
    exit 1
  fi
  
  # Check if app is running
  if pgrep -f "Sankalpa" > /dev/null; then
    echo "Warning: Sankalpa appears to be running. Close it first."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
  
  cp "$backup_file" "$DB_PATH"
  echo "Restored from: $backup_file"
}

list_backups() {
  if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
    echo "No backups found in $BACKUP_DIR"
    exit 0
  fi
  
  echo "Available backups:"
  ls -lh "$BACKUP_DIR"/*.db 2>/dev/null | awk '{print "  " $NF " (" $5 ", " $6 " " $7 " " $8 ")"}' | sed "s|$BACKUP_DIR/||"
}

case "$1" in
  backup)  backup "$2" ;;
  restore) restore "$2" ;;
  list)    list_backups ;;
  *)       usage; exit 1 ;;
esac
