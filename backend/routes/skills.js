const express = require('express');
const pool = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM skills WHERE is_active = 1 ORDER BY sort_order, name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Skill name required' });
  try {
    const { rows: maxRows } = await pool.query('SELECT MAX(sort_order) as m FROM skills');
    const maxOrder = maxRows[0].m ?? -1;
    const { rows } = await pool.query(
      'INSERT INTO skills (name, sort_order) VALUES ($1, $2) RETURNING id, name, is_active',
      [name.trim(), maxOrder + 1]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Skill already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, is_active } = req.body;
  const { id } = req.params;
  try {
    if (name !== undefined) await pool.query('UPDATE skills SET name = $1 WHERE id = $2', [name, id]);
    if (is_active !== undefined) await pool.query('UPDATE skills SET is_active = $1 WHERE id = $2', [is_active ? 1 : 0, id]);
    const { rows } = await pool.query('SELECT * FROM skills WHERE id = $1', [id]);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
