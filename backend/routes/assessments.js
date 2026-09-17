const express = require('express');
const pool = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Submit or update a batch of skill scores for a given assessee/quarter/year/type
router.post('/', authenticate, async (req, res) => {
  const { assessee_id, evaluator_type, quarter, year, scores } = req.body;

  if (!assessee_id || !evaluator_type || !quarter || !year || !scores?.length) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (evaluator_type === 'self' && req.user.id !== parseInt(assessee_id)) {
    return res.status(403).json({ error: 'Can only submit self-assessment for yourself' });
  }
  if (evaluator_type === 'manager' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only managers can submit manager assessments' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { skill_id, score } of scores) {
      await client.query(`
        INSERT INTO assessments (assessee_id, assessor_id, evaluator_type, skill_id, score, quarter, year, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT(assessee_id, evaluator_type, skill_id, quarter, year)
        DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()
      `, [assessee_id, req.user.id, evaluator_type, skill_id, score, quarter, parseInt(year)]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Assessment saved' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[assessments/post]', e.message);
    res.status(500).json({ error: 'Failed to save assessment' });
  } finally {
    client.release();
  }
});

// Get assessments for a specific user
router.get('/user/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;
  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { quarter, year, evaluator_type } = req.query;
  let query = `
    SELECT a.*, s.name as skill_name, u.name as assessor_name
    FROM assessments a
    JOIN skills s ON a.skill_id = s.id
    JOIN users u ON a.assessor_id = u.id
    WHERE a.assessee_id = $1
  `;
  const params = [parseInt(userId)];

  if (quarter) { query += ` AND a.quarter = $${params.length + 1}`; params.push(quarter); }
  if (year) { query += ` AND a.year = $${params.length + 1}`; params.push(parseInt(year)); }
  if (evaluator_type) { query += ` AND a.evaluator_type = $${params.length + 1}`; params.push(evaluator_type); }

  query += ' ORDER BY a.year DESC, a.quarter, s.sort_order';

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all assessments for team dashboard (admin only)
router.get('/team', authenticate, requireAdmin, async (req, res) => {
  const { quarter, year } = req.query;
  let query = `
    SELECT a.*, s.name as skill_name, u.name as assessee_name, u.username as assessee_username
    FROM assessments a
    JOIN skills s ON a.skill_id = s.id
    JOIN users u ON a.assessee_id = u.id
    WHERE u.role = 'designer' AND u.deleted_at IS NULL
  `;
  const params = [];

  if (quarter) { query += ` AND a.quarter = $${params.length + 1}`; params.push(quarter); }
  if (year) { query += ` AND a.year = $${params.length + 1}`; params.push(parseInt(year)); }

  query += ' ORDER BY u.name, a.year DESC, a.quarter, s.sort_order';

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get completed quarters for a user
router.get('/user/:userId/history', authenticate, async (req, res) => {
  const { userId } = req.params;
  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT quarter, year, evaluator_type
      FROM assessments
      WHERE assessee_id = $1
      ORDER BY year DESC, quarter DESC
    `, [parseInt(userId)]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Clear assessments for a user (optionally scoped to quarter/year/evaluator_type)
router.delete('/user/:userId', authenticate, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { quarter, year, evaluator_type } = req.query;

  let query = 'DELETE FROM assessments WHERE assessee_id = $1';
  const params = [parseInt(userId)];

  if (quarter) { query += ` AND quarter = $${params.length + 1}`; params.push(quarter); }
  if (year) { query += ` AND year = $${params.length + 1}`; params.push(parseInt(year)); }
  if (evaluator_type) { query += ` AND evaluator_type = $${params.length + 1}`; params.push(evaluator_type); }

  try {
    await pool.query(query, params);
    res.json({ message: 'Assessments cleared' });
  } catch (e) {
    console.error('[assessments/delete]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
