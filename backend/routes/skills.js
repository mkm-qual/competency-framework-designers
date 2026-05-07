const express = require('express');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const skills = db.prepare('SELECT * FROM skills WHERE is_active = 1 ORDER BY sort_order, name').all();
  res.json(skills);
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Skill name required' });
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM skills').get().m ?? -1;
  try {
    const result = db.prepare('INSERT INTO skills (name, sort_order) VALUES (?, ?)').run(name.trim(), maxOrder + 1);
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), is_active: 1 });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Skill already exists' });
    throw e;
  }
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { name, is_active } = req.body;
  const { id } = req.params;
  if (name !== undefined) db.prepare('UPDATE skills SET name = ? WHERE id = ?').run(name, id);
  if (is_active !== undefined) db.prepare('UPDATE skills SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, id);
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(id);
  res.json(skill);
});

module.exports = router;
