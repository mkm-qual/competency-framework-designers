const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const DB_PATH = path.join(__dirname, 'data.db');
const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 30; // keep last 30 daily backups

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup(label = 'auto') {
  ensureBackupDir();
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const filename = `backup_${label}_${ts}.db`;
  const dest = path.join(BACKUP_DIR, filename);

  // Use SQLite's built-in online backup API (safe even while server is running)
  const src = new Database(DB_PATH, { readonly: true });
  src.backup(dest)
    .then(() => {
      src.close();
      console.log(`[Backup] Created: ${filename}`);
      pruneOldBackups();
    })
    .catch(err => {
      src.close();
      console.error('[Backup] Failed:', err.message);
    });

  return filename;
}

function pruneOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time); // newest first

  // Keep only auto backups within limit; always keep manual ones
  const autoFiles = files.filter(f => f.name.includes('_auto_'));
  if (autoFiles.length > MAX_BACKUPS) {
    autoFiles.slice(MAX_BACKUPS).forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f.name));
      console.log(`[Backup] Pruned old backup: ${f.name}`);
    });
  }
}

function listBackups() {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        filename: f,
        size: stats.size,
        created_at: stats.mtime.toISOString(),
        label: f.includes('_manual_') ? 'manual' : 'auto',
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function restoreBackup(filename) {
  const src = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(src)) throw new Error(`Backup not found: ${filename}`);
  if (!filename.endsWith('.db')) throw new Error('Invalid backup file');

  // Safety: create a backup of current DB before restoring
  const emergencyName = createBackup('pre-restore');

  // Copy backup over current DB
  fs.copyFileSync(src, DB_PATH);
  console.log(`[Backup] Restored from: ${filename} (pre-restore backup: ${emergencyName})`);
  return emergencyName;
}

// Schedule: daily at 2:00 AM
function startScheduler() {
  cron.schedule('0 2 * * *', () => {
    console.log('[Backup] Running scheduled daily backup...');
    createBackup('auto');
  });
  console.log('[Backup] Scheduler started — daily backups at 2:00 AM');

  // Also run one on startup if no backup exists today
  const today = new Date().toISOString().slice(0, 10);
  ensureBackupDir();
  const todayBackupExists = fs.readdirSync(BACKUP_DIR)
    .some(f => f.includes(today.replace(/-/g, '-')));
  if (!todayBackupExists) {
    console.log('[Backup] No backup found for today — creating startup backup...');
    createBackup('auto');
  }
}

module.exports = { createBackup, listBackups, restoreBackup, startScheduler };
