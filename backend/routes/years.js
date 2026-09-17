const express = require('express');
const pool = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM years WHERE is_active = 1 ORDER BY year DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { year } = req.body;
  if (!year || isNaN(year)) return res.status(400).json({ error: 'Valid year required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO years (year) VALUES ($1) RETURNING id, year, is_active',
      [parseInt(year)]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Year already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
