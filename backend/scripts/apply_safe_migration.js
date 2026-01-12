import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import 'dotenv/config';

async function apply() {
  const schemaPath = path.resolve(process.cwd(), 'backend', 'db', 'SAFE_PRODUCTION_MIGRATION.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('SAFE_PRODUCTION_MIGRATION.sql not found at', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  // DATABASE_URL must be provided in env or .env
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Please set DATABASE_URL environment variable (postgres connection string)');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to Postgres, applying SAFE_PRODUCTION_MIGRATION...');
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Failed to apply migration:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

apply();
