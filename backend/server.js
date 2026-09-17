require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/years', require('./routes/years'));
app.use('/api/assessments', require('./routes/assessments'));

// Serve frontend only when running locally (Vercel serves static files via CDN)
if (!process.env.VERCEL) {
  const frontendBuild = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// Export for Vercel serverless — listen only when run directly (PM2/local)
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
