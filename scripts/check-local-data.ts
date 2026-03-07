import initSqlJs from 'sql.js';
import fs from 'fs';

async function check() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(process.env.HOME + '/Library/Application Support/Sankalpa/sankalpa.db');
  const db = new SQL.Database(buffer);

  console.log('=== TASKS WITH DUE_DATE ===');
  const withDue = db.exec('SELECT id, title, due_date FROM tasks WHERE due_date IS NOT NULL LIMIT 5');
  if (withDue[0]) {
    console.log('Count:', withDue[0].values.length);
    withDue[0].values.forEach(row => console.log(row));
  } else {
    console.log('None found');
  }

  console.log('\n=== TASKS WITH DURATION ===');
  const withDuration = db.exec('SELECT id, title, duration FROM tasks WHERE duration IS NOT NULL LIMIT 5');
  if (withDuration[0]) {
    console.log('Count:', withDuration[0].values.length);
    withDuration[0].values.forEach(row => console.log(row));
  } else {
    console.log('None found');
  }

  console.log('\n=== TASKS WITH DELETED_AT ===');
  const deleted = db.exec('SELECT id, title, deleted_at FROM tasks WHERE deleted_at IS NOT NULL LIMIT 5');
  if (deleted[0]) {
    console.log('Count:', deleted[0].values.length);
    deleted[0].values.forEach(row => console.log(row));
  } else {
    console.log('None found');
  }

  console.log('\n=== TASKS WITH NOTES ===');
  const withNotes = db.exec('SELECT id, title, notes FROM tasks WHERE notes IS NOT NULL LIMIT 5');
  if (withNotes[0]) {
    console.log('Count:', withNotes[0].values.length);
    withNotes[0].values.forEach(row => console.log(row));
  } else {
    console.log('None found');
  }

  console.log('\n=== FOLDERS COUNT ===');
  const folders = db.exec('SELECT COUNT(*) FROM folders');
  console.log('Total folders:', folders[0]?.values[0]?.[0]);

  console.log('\n=== LISTS COUNT ===');
  const lists = db.exec('SELECT COUNT(*) FROM lists');
  console.log('Total lists:', lists[0]?.values[0]?.[0]);
}

check();
