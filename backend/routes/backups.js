const express = require('express');
const path = require('path');
const { createBackup, listBackups, restoreBackup } = require('../backup');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// List all backups
router.get('/', authenticate, requireAdmin, (req, res) => {
  const backups = listBackups();
  res.json(backups);
});

// Trigger a manual backup
router.post('/create', authenticate, requireAdmin, (req, res) => {
  const filename = createBackup('manual');
  res.json({ message: 'Backup created', filename });
});

// Restore from a backup (requires confirmation flag)
router.post('/restore', authenticate, requireAdmin, (req, res) => {
  const { filename, confirmed } = req.body;
  if (!confirmed) return res.status(400).json({ error: 'Pass confirmed:true to restore' });
  if (!filename) return res.status(400).json({ error: 'filename required' });

  try {
    const emergencyBackup = restoreBackup(filename);
    // Server must restart to pick up restored DB
    res.json({
      message: `Restored from ${filename}. Pre-restore backup saved as ${emergencyBackup}. Restart the server to apply.`,
      requires_restart: true,
    });
    // Graceful restart after response is sent
    setTimeout(() => process.exit(0), 500);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Download a backup file
router.get('/download/:filename', authenticate, requireAdmin, (req, res) => {
  const { filename } = req.params;
  if (!filename.endsWith('.db') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.join(__dirname, '../backups', filename);
  res.download(filepath);
});

module.exports = router;
