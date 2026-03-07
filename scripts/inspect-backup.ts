import initSqlJs from 'sql.js';
import fs from 'fs';

async function inspect() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync('/Users/nhsng/.sankalpa-backups/2026-03-06_150644.db');
  const db = new SQL.Database(buffer);

  console.log('=== FOLDERS COUNT ===');
  const folders = db.exec('SELECT COUNT(*) FROM folders');
  console.log('Total folders:', folders[0]?.values[0]?.[0]);

  console.log('\n=== LISTS COUNT ===');
  const lists = db.exec('SELECT COUNT(*) FROM lists');
  console.log('Total lists:', lists[0]?.values[0]?.[0]);

  console.log('\n=== TASKS COUNT ===');
  const tasks = db.exec('SELECT COUNT(*) FROM tasks');
  console.log('Total tasks:', tasks[0]?.values[0]?.[0]);

  console.log('\n=== FOLDERS ===');
  const folderList = db.exec('SELECT id, name FROM folders');
  if (folderList[0]) {
    folderList[0].values.forEach(row => console.log(row));
  }

  console.log('\n=== LISTS (top level only) ===');
  const listList = db.exec('SELECT id, name, folder_id FROM lists WHERE folder_id IS NULL');
  if (listList[0]) {
    listList[0].values.forEach(row => console.log(row));
  }
}

inspect();
