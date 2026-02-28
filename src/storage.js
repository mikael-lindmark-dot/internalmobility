const fs = require('fs');
const path = require('path');

function createJsonStore(dbPath) {
  const resolved = dbPath || path.join(__dirname, '..', 'data', 'db.json');

  return {
    mode: 'json',
    async readDb() {
      return JSON.parse(fs.readFileSync(resolved, 'utf8'));
    },
    async writeDb(db) {
      fs.writeFileSync(resolved, JSON.stringify(db, null, 2));
    },
    async close() {
      return undefined;
    }
  };
}

function createPostgresStore(connectionString) {
  let pool;

  function getPool() {
    if (!pool) {
      // eslint-disable-next-line global-require
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: connectionString || process.env.DATABASE_URL
      });
    }
    return pool;
  }

  return {
    mode: 'postgres',
    async readDb() {
      const query = 'SELECT data FROM app_state WHERE id = 1';
      const result = await getPool().query(query);
      if (result.rows.length === 0) {
        throw new Error('Postgres app_state is empty. Run migrations and seed first.');
      }
      return result.rows[0].data;
    },
    async writeDb(db) {
      const query = `
        INSERT INTO app_state (id, data, updated_at)
        VALUES (1, $1::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
      await getPool().query(query, [JSON.stringify(db)]);
    },
    async close() {
      if (pool) {
        await pool.end();
      }
    }
  };
}

function createStore(options = {}) {
  const mode = options.mode || process.env.STORAGE_MODE || 'json';

  if (mode === 'postgres') {
    return createPostgresStore(options.connectionString);
  }

  return createJsonStore(options.dbPath);
}

module.exports = {
  createStore
};
