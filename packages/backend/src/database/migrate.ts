import fs from 'fs';
import path from 'path';
import { pool, query } from './index';

async function getAppliedMigrations(): Promise<string[]> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const result = await query<{ name: string }>('SELECT name FROM migrations ORDER BY id');
    return result.rows.map((r) => r.name);
  } catch (error) {
    console.error('Failed to get applied migrations:', error);
    throw error;
  }
}

async function applyMigration(filePath: string, name: string): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
    await client.query('COMMIT');
    console.log(`Applied migration: ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed to apply migration ${name}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const applied = await getAppliedMigrations();

  for (const file of files) {
    const name = path.basename(file, '.sql');
    if (applied.includes(name)) {
      console.log(`Skipping already applied migration: ${name}`);
      continue;
    }
    const filePath = path.join(migrationsDir, file);
    await applyMigration(filePath, name);
  }

  console.log('All migrations completed.');
}

runMigrations()
  .then(() => {
    console.log('Migration process finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });
