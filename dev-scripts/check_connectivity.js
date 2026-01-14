import { supabase } from '../backend/services/supabaseService.js';

async function checkStatus() {
    console.log('--- WhatsApp Connection Diagnostic ---');
    
    if (supabase._inmemory) {
        console.log('Running with IN-MEMORY DB');
    } else {
        console.log('Running with SUPABASE');
    }

    try {
        const { data: connections, error } = await supabase
            .from('unit_whatsapp_connections')
            .select('*');

        if (error) {
            console.error('Error fetching connections:', error.message);
            return;
        }

        console.log(`Found ${connections.length} connections.`);
        
        connections.forEach(conn => {
            console.log(`- Unit: ${conn.unit_id}`);
            console.log(`  Provider: ${conn.provider}`);
            console.log(`  Status: ${conn.status}`);
            console.log(`  Instance: ${conn.instance_id}`);
            console.log('---');
        });

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

checkStatus();
