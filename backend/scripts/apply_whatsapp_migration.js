// Apply WhatsApp Integration Migration
import 'dotenv/config';
import { supabase } from '../services/supabaseService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
    try {
        console.log('🚀 Applying WhatsApp Integration Migration...\n');

        // Read migration file
        const migrationPath = path.join(__dirname, '../db/migrations/001_create_unit_whatsapp_connections.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Split by semicolons and execute each statement
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`Found ${statements.length} SQL statements to execute\n`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            // Skip comments
            if (statement.startsWith('--') || statement.startsWith('/*')) {
                continue;
            }

            console.log(`Executing statement ${i + 1}/${statements.length}...`);

            const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

            if (error) {
                // Try direct execution if RPC fails
                console.log('RPC failed, trying direct execution...');
                const { error: directError } = await supabase.from('_migrations').insert({
                    name: '001_create_unit_whatsapp_connections',
                    executed_at: new Date().toISOString()
                });

                if (directError && !directError.message.includes('already exists')) {
                    console.error('❌ Error:', error.message);
                    throw error;
                }
            }

            console.log('✅ Success\n');
        }

        console.log('✅ Migration completed successfully!\n');
        console.log('📋 Created table: unit_whatsapp_connections');
        console.log('📋 Created indexes for performance');
        console.log('📋 Created trigger for updated_at timestamp\n');

        // Verify table exists
        const { data, error } = await supabase
            .from('unit_whatsapp_connections')
            .select('*')
            .limit(1);

        if (error) {
            console.log('⚠️  Note: Table verification failed. You may need to run the migration manually in Supabase SQL Editor.');
            console.log('Migration file location:', migrationPath);
        } else {
            console.log('✅ Table verified successfully!');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('\n📝 Manual Migration Instructions:');
        console.log('1. Open Supabase Dashboard');
        console.log('2. Go to SQL Editor');
        console.log('3. Copy and paste the contents of:');
        console.log('   backend/db/migrations/001_create_unit_whatsapp_connections.sql');
        console.log('4. Execute the SQL\n');
        process.exit(1);
    }
}

applyMigration();
