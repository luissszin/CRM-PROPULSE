import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key'; // Ideally service_role
// Using the service role key if available or just the client found in .env
// Re-using service logic if possible or just assuming standard envs.

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAndMigrate() {
    console.log('Checking whatsapp_instances table...');

    // Check if table exists
    const { error } = await supabase.from('whatsapp_instances').select('id').limit(1);

    if (error && error.code === '42P01') { // undefined_table
        console.log('Table whatsapp_instances does not exist. Creating...');
        // We cannot create table via JS client easily unless we use RPC or direct SQL if enabled.
        // But typically we can't do DDL via standard client.
        console.error('CRITICAL: whatsapp_instances table is missing. Run schema.sql in Supabase SQL Editor.');
        return;
    }

    console.log('Table exists. Checking columns...');
    // We can't easily inspect columns via standard client without introspection.
    // We will try to select the specific new columns.

    const { data, error: colError } = await supabase
        .from('whatsapp_instances')
        .select('provider_config')
        .limit(1);

    if (colError) {
        console.log('Column provider_config seems missing based on select error:', colError.message);
        // NOTE: Supabase client might return error if column doesn't exist.
        console.log('Please run the following SQL in Supabase:');
        console.log(`
        alter table whatsapp_instances add column if not exists provider text default 'evolution';
        alter table whatsapp_instances add column if not exists provider_config jsonb;
        alter table whatsapp_instances add column if not exists phone text;
        alter table whatsapp_instances add column if not exists qrcode text;
      `);
    } else {
        console.log('Column provider_config exists!');
    }
}

checkAndMigrate();
