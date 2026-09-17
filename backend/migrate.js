require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  console.error('[Migrate] DATABASE_URL is not set. Create a .env file with DATABASE_URL=your_neon_connection_string');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'designer')),
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS years (
        id SERIAL PRIMARY KEY,
        year INTEGER UNIQUE NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id SERIAL PRIMARY KEY,
        assessee_id INTEGER NOT NULL REFERENCES users(id),
        assessor_id INTEGER NOT NULL REFERENCES users(id),
        evaluator_type TEXT NOT NULL CHECK(evaluator_type IN ('self', 'manager')),
        skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK(score >= 0 AND score <= 5),
        quarter TEXT NOT NULL CHECK(quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
        year INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(assessee_id, evaluator_type, skill_id, quarter, year)
      )
    `);

    // Seed admin user if not present
    const { rows: adminRows } = await client.query(`SELECT id FROM users WHERE username = 'admin'`);
    if (adminRows.length === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      await client.query(
        `INSERT INTO users (username, password_hash, name, role) VALUES ('admin', $1, 'Admin', 'admin')`,
        [hash]
      );
      console.log('[Migrate] Created default admin user (admin / admin123)');
    }

    // Seed skills if empty
    const { rows: skillRows } = await client.query(`SELECT COUNT(*) as cnt FROM skills`);
    if (parseInt(skillRows[0].cnt) === 0) {
      const defaultSkills = [
        'Communication', 'Facilitation', 'Strategy', 'Data & Insights',
        'User Research', 'Prototyping', 'Interaction Design',
        'Visual Design', 'Information Architecture', 'Storytelling',
      ];
      for (let i = 0; i < defaultSkills.length; i++) {
        await client.query(
          `INSERT INTO skills (name, sort_order) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
          [defaultSkills[i], i]
        );
      }
      console.log('[Migrate] Seeded 10 default skills');
    }

    // Seed years if empty
    const { rows: yearRows } = await client.query(`SELECT COUNT(*) as cnt FROM years`);
    if (parseInt(yearRows[0].cnt) === 0) {
      const currentYear = new Date().getFullYear();
      await client.query(`INSERT INTO years (year) VALUES ($1) ON CONFLICT (year) DO NOTHING`, [currentYear]);
      await client.query(`INSERT INTO years (year) VALUES ($1) ON CONFLICT (year) DO NOTHING`, [currentYear + 1]);
      console.log(`[Migrate] Seeded years ${currentYear} and ${currentYear + 1}`);
    }

    await client.query('COMMIT');
    console.log('[Migrate] Done.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[Migrate] Error:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
