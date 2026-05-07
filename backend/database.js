const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'designer')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assessor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      evaluator_type TEXT NOT NULL CHECK(evaluator_type IN ('self', 'manager')),
      skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      score INTEGER NOT NULL CHECK(score >= 0 AND score <= 5),
      quarter TEXT NOT NULL CHECK(quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
      year INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(assessee_id, evaluator_type, skill_id, quarter, year)
    );
  `);

  // Seed default admin if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run('admin', hash, 'Admin', 'admin');
  }

  // Seed default skills
  const skillCount = db.prepare('SELECT COUNT(*) as cnt FROM skills').get();
  if (skillCount.cnt === 0) {
    const defaultSkills = [
      'Communication', 'Facilitation', 'Strategy', 'Data & Insights',
      'User Research', 'Prototyping', 'Interaction Design',
      'Visual Design', 'Information Architecture', 'Storytelling'
    ];
    const insert = db.prepare('INSERT INTO skills (name, sort_order) VALUES (?, ?)');
    defaultSkills.forEach((name, i) => insert.run(name, i));
  }

  // Seed default years
  const yearCount = db.prepare('SELECT COUNT(*) as cnt FROM years').get();
  if (yearCount.cnt === 0) {
    const currentYear = new Date().getFullYear();
    db.prepare('INSERT INTO years (year) VALUES (?)').run(currentYear);
    db.prepare('INSERT INTO years (year) VALUES (?)').run(currentYear + 1);
  }
}

init();

module.exports = db;
