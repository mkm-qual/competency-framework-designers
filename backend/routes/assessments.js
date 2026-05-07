const express = require('express');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Submit or update a batch of skill scores for a given assessee/quarter/year/type
router.post('/', authenticate, (req, res) => {
  const { assessee_id, evaluator_type, quarter, year, scores } = req.body;
  // scores: [{ skill_id, score }]

  if (!assessee_id || !evaluator_type || !quarter || !year || !scores?.length) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Permission check
  if (evaluator_type === 'self' && req.user.id !== assessee_id) {
    return res.status(403).json({ error: 'Can only submit self-assessment for yourself' });
  }
  if (evaluator_type === 'manager' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only managers can submit manager assessments' });
  }

  const upsert = db.prepare(`
    INSERT INTO assessments (assessee_id, assessor_id, evaluator_type, skill_id, score, quarter, year, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(assessee_id, evaluator_type, skill_id, quarter, year)
    DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at
  `);

  const runBatch = db.transaction(() => {
    for (const { skill_id, score } of scores) {
      upsert.run(assessee_id, req.user.id, evaluator_type, skill_id, score, quarter, year);
    }
  });

  runBatch();
  res.json({ message: 'Assessment saved' });
});

// Get assessments for a specific user (designer sees own, admin sees any)
router.get('/user/:userId', authenticate, (req, res) => {
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
    WHERE a.assessee_id = ?
  `;
  const params = [userId];

  if (quarter) { query += ' AND a.quarter = ?'; params.push(quarter); }
  if (year) { query += ' AND a.year = ?'; params.push(year); }
  if (evaluator_type) { query += ' AND a.evaluator_type = ?'; params.push(evaluator_type); }

  query += ' ORDER BY a.year DESC, a.quarter, s.sort_order';

  const assessments = db.prepare(query).all(...params);
  res.json(assessments);
});

// Get all assessments (admin only) — for team dashboard
router.get('/team', authenticate, requireAdmin, (req, res) => {
  const { quarter, year } = req.query;
  let query = `
    SELECT a.*, s.name as skill_name, u.name as assessee_name, u.username as assessee_username
    FROM assessments a
    JOIN skills s ON a.skill_id = s.id
    JOIN users u ON a.assessee_id = u.id
    WHERE u.role = 'designer'
  `;
  const params = [];

  if (quarter) { query += ' AND a.quarter = ?'; params.push(quarter); }
  if (year) { query += ' AND a.year = ?'; params.push(year); }

  query += ' ORDER BY u.name, a.year DESC, a.quarter, s.sort_order';

  const assessments = db.prepare(query).all(...params);
  res.json(assessments);
});

// Get completed quarters for a user
router.get('/user/:userId/history', authenticate, (req, res) => {
  const { userId } = req.params;
  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const history = db.prepare(`
    SELECT DISTINCT quarter, year, evaluator_type
    FROM assessments
    WHERE assessee_id = ?
    ORDER BY year DESC, quarter DESC
  `).all(userId);

  res.json(history);
});

module.exports = router;
