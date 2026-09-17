if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  module.exports = new Pool({ connectionString: process.env.DATABASE_URL });
} else {
  // Local dev: SQLite with a pg-compatible async interface
  const Database = require('better-sqlite3');
  const path = require('path');

  const db = new Database(path.join(__dirname, 'data.db'));
  db.pragma('journal_mode = WAL');

  function adaptSql(sql) {
    return sql
      .replace(/\$\d+/g, '?')
      .replace(/NOW\(\)/gi, "datetime('now')");
  }

  function run(sql, params = []) {
    const s = adaptSql(sql);
    if (/RETURNING/i.test(s)) return { rows: db.prepare(s).all(params) };
    const upper = s.trimStart().toUpperCase();
    if (upper.startsWith('SELECT') || upper.startsWith('WITH'))
      return { rows: db.prepare(s).all(params) };
    db.prepare(s).run(params);
    return { rows: [] };
  }

  const pool = {
    query: async (sql, params) => run(sql, params),
    connect: async () => ({
      query: async (sql, params) => {
        const u = sql.trim().toUpperCase();
        if (u === 'BEGIN')    { db.prepare('BEGIN').run();    return { rows: [] }; }
        if (u === 'COMMIT')   { db.prepare('COMMIT').run();   return { rows: [] }; }
        if (u === 'ROLLBACK') { db.prepare('ROLLBACK').run(); return { rows: [] }; }
        return run(sql, params);
      },
      release: () => {},
    }),
  };

  module.exports = pool;
}
