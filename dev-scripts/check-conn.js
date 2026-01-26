import { supabase } from '../backend/services/supabaseService.js';

async function check() {
  const { data, error } = await supabase.from('unit_whatsapp_connections').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Connections:', data);
  }
}

check();
