import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { from as memFrom, tables as memTables } from './inmemoryDb.js';

let supabase = null;
try {
  // Force in-memory for tests to ensure isolation and speed
  if (process.env.NODE_ENV !== 'test' && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('Supabase client initialized');
  } else {
    console.warn('Supabase environment variables missing; using in-memory DB for development.');
    // provide a minimal supabase-like API backed by in-memory tables
    supabase = { from: memFrom, _inmemory: true, _tables: memTables };
  }
} catch (err) {
  console.error('Failed to initialize Supabase client:', err);
  console.warn('Falling back to in-memory DB.');
  supabase = { from: memFrom, _inmemory: true, _tables: memTables };
}

export { supabase };
