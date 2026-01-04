import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import 'dotenv/config';

async function apply() {
  const schemaPath = path.resolve(process.cwd(), 'backend', 'db', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('schema.sql not found at', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  // DATABASE_URL must be provided in env or .env
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Please set DATABASE_URL environment variable (postgres connection string)');
    console.error('Example: postgresql://user:pass@127.0.0.1:5432/dbname');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to Postgres, applying schema...');
    // Split on semicolon followed by newline to avoid very large single query issues
    // But keep as single query if need be
    await client.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Failed to apply schema:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

apply();
