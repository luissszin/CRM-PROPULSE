import { supabase } from '../backend/services/supabaseService.js';

async function checkOldStatus() {
    console.log('--- Checking legacy whatsapp_instances table ---');
    
    try {
        const { data: instances, error } = await supabase
            .from('whatsapp_instances')
            .select('*');

        if (error) {
            console.log('Legacy table whatsapp_instances does not exist or error:', error.message);
            return;
        }

        console.log(`Found ${instances.length} legacy instances.`);
        instances.forEach(ins => {
            console.log(`- Instance: ${ins.instanceName} (Unit: ${ins.unit_id})`);
            console.log(`  Status: ${ins.status}`);
        });

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

checkOldStatus();
