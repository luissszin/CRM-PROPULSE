import 'dotenv/config';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(url, key);
  const email = 'admin@propulse.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`Checking if user ${email} exists...`);
  
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    console.log('User already exists. Updating password...');
    const { error } = await supabase
      .from('users')
      .update({ password: hashedPassword, role: 'super_admin' })
      .eq('id', existing.id);
    if (error) console.error('Error updating user:', error);
    else console.log('User updated successfully.');
  } else {
    console.log('User not found. Creating...');
    const { error } = await supabase
      .from('users')
      .insert({
        name: 'Super Admin',
        email,
        password: hashedPassword,
        role: 'super_admin'
      });
    if (error) console.error('Error creating user:', error);
    else console.log('User created successfully.');
  }

  // Also ensure at least one Unit exists for testing
  console.log('Ensuring a Demo Unit exists...');
  const { data: units } = await supabase.from('units').select('id').limit(1);
  if (!units || units.length === 0) {
    const { error } = await supabase.from('units').insert({
      name: 'Unidade Matriz',
      slug: 'matriz',
      metadata: { active: true }
    });
    if (error) console.error('Error creating unit:', error);
    else console.log('Demo unit created.');
  } else {
    console.log('Units already exist.');
  }
}

run();
