const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, name, role, created_at FROM users WHERE deleted_at IS NULL ORDER BY role, name'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) return res.status(400).json({ error: 'All fields required' });
  if (!['admin', 'designer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try {
    const { rows: existing } = await pool.query('SELECT id, deleted_at FROM users WHERE username = $1', [username]);
    const found = existing[0];
    if (found && !found.deleted_at) return res.status(409).json({ error: 'Username already exists' });

    const hash = bcrypt.hashSync(password, 10);
    if (found && found.deleted_at) {
      const { rows } = await pool.query(
        'UPDATE users SET password_hash=$1, name=$2, role=$3, deleted_at=NULL WHERE id=$4 RETURNING id, username, name, role',
        [hash, name, role, found.id]
      );
      return res.status(201).json(rows[0]);
    }

    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, name, role',
      [username, hash, name, role]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    console.error('[users/post]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, password } = req.body;
  const { id } = req.params;
  try {
    if (name) await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, id]);
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
    }
    const { rows } = await pool.query('SELECT id, username, name, role FROM users WHERE id = $1', [id]);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft-delete: sets deleted_at, preserves all assessment data
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  try {
    await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [id]);
    res.json({ message: 'User deactivated. All assessment data is preserved and can be accessed by admin.' });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/archived', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, name, role, deleted_at, created_at FROM users WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
