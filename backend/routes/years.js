const express = require('express');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const years = db.prepare('SELECT * FROM years WHERE is_active = 1 ORDER BY year DESC').all();
  res.json(years);
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  const { year } = req.body;
  if (!year || isNaN(year)) return res.status(400).json({ error: 'Valid year required' });
  try {
    const result = db.prepare('INSERT INTO years (year) VALUES (?)').run(parseInt(year));
    res.status(201).json({ id: result.lastInsertRowid, year: parseInt(year), is_active: 1 });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Year already exists' });
    throw e;
  }
});

module.exports = router;
