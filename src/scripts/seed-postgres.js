const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed Postgres.');
  }

  const dbPath = process.env.SEED_JSON_PATH || path.join(__dirname, '..', '..', 'data', 'db.json');
  const payload = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const pool = new Pool({ connectionString });
  try {
    await pool.query(
      `
      INSERT INTO app_state (id, data, updated_at)
      VALUES (1, $1::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `,
      [JSON.stringify(payload)]
    );

    console.log('Seeded app_state from JSON successfully.');
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
