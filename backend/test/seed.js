import 'dotenv/config';
import { supabase } from '../services/supabaseService.js';

async function seed() {
  if (!supabase) {
    console.error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  console.log('Seeding sample contacts and conversations...');

  const contacts = [
    { phone: '5511999990001', name: 'Alice' },
    { phone: '5511999990002', name: 'Bob' },
    { phone: '5511999990003', name: 'Carol' }
  ];

  for (const c of contacts) {
    try {
      const { data: existing } = await supabase.from('contacts').select('*').eq('phone', c.phone).single();
      let contact = existing;
      if (!existing) {
        const { data } = await supabase.from('contacts').insert(c).select().single();
        contact = data;
      }

      // create conversation if none
      const { data: conv } = await supabase.from('conversations').select('*').eq('contact_id', contact.id).single();
      let conversation = conv;
      if (!conv) {
        const { data: created } = await supabase.from('conversations').insert({ contact_id: contact.id }).select().single();
        conversation = created;
      }

      // insert a couple of messages if none
      const { data: msgs } = await supabase.from('messages').select('*').eq('conversation_id', conversation.id).limit(1);
      if (!msgs || msgs.length === 0) {
        await supabase.from('messages').insert([
          { conversation_id: conversation.id, sender: 'lead', content: `Olá, eu sou ${c.name}` },
          { conversation_id: conversation.id, sender: 'agent', content: `Oi ${c.name}, como posso ajudar?`, status: 'sent' }
        ]);
      }
    } catch (err) {
      console.error('Seed error for', c, err?.message ?? err);
    }
  }

  console.log('Seeding finished.');
  process.exit(0);
}

seed();