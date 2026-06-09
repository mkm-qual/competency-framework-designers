const express = require('express');
const cors = require('cors');
const path = require('path');
const { startScheduler } = require('./backup');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/years', require('./routes/years'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/backups', require('./routes/backups'));

// Serve frontend in production
const frontendBuild = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Start daily backup scheduler + immediate startup backup
  startScheduler();
});
