const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// List all active users (admin only)
router.get('/', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, username, name, role, created_at FROM users WHERE deleted_at IS NULL ORDER BY role, name'
  ).all();
  res.json(users);
});

// Create user (admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) return res.status(400).json({ error: 'All fields required' });
  if (!['admin', 'designer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  // Check if username exists among active users
  const existing = db.prepare('SELECT id, deleted_at FROM users WHERE username = ?').get(username);
  if (existing && !existing.deleted_at) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    if (existing && existing.deleted_at) {
      // Reactivate a previously deleted user with the same username
      db.prepare('UPDATE users SET password_hash=?, name=?, role=?, deleted_at=NULL WHERE id=?')
        .run(hash, name, role, existing.id);
      const user = db.prepare('SELECT id, username, name, role FROM users WHERE id=?').get(existing.id);
      return res.status(201).json(user);
    }
    const result = db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run(username, hash, name, role);
    res.status(201).json({ id: result.lastInsertRowid, username, name, role });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
    throw e;
  }
});

// Update user (admin only)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { name, password } = req.body;
  const { id } = req.params;
  if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, id);
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  }
  const user = db.prepare('SELECT id, username, name, role FROM users WHERE id = ?').get(id);
  res.json(user);
});

// Soft-delete user (admin only — preserves all assessment data)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

  // Soft-delete: mark deleted_at, DON'T remove any rows
  db.prepare("UPDATE users SET deleted_at = datetime('now') WHERE id = ?").run(id);
  res.json({ message: 'User deactivated. All assessment data is preserved and can be accessed by admin.' });
});

// List soft-deleted users (admin only — for data audit)
router.get('/archived', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, username, name, role, deleted_at, created_at FROM users WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
  ).all();
  res.json(users);
});

module.exports = router;
