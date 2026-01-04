import { supabase } from '../services/supabaseService.js';

export const receiveZapiMessage = async (req, res) => {
  try {
    const data = req.body || {};

    if (!data.message || data.fromMe) {
      return res.sendStatus(200);
    }

    if (!supabase) {
      console.error('Supabase client not initialized - skipping message processing');
      return res.sendStatus(503);
    }

    const phone = data.phone;
    const text = data.message.text;

    // 1. Buscar ou criar contato
    let contactRes = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', phone)
      .single();

    let contact = contactRes?.data ?? null;

    if (!contact) {
      const result = await supabase
        .from('contacts')
        .insert({ phone })
        .select()
        .single();

      contact = result?.data ?? null;
    }

    if (!contact) {
      console.warn('Could not create or find contact for phone', phone);
      return res.sendStatus(500);
    }

    // 2. Buscar ou criar conversa
    let convRes = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('status', 'open')
      .single();

    let conversation = convRes?.data ?? null;

    if (!conversation) {
      const result = await supabase
        .from('conversations')
        .insert({ contact_id: contact.id })
        .select()
        .single();

      conversation = result?.data ?? null;
    }

    if (!conversation) {
      console.warn('Could not create or find conversation for contact', contact.id);
      return res.sendStatus(500);
    }

    // 3. Salvar mensagem
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender: 'lead',
      content: text
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error('Error in receiveZapiMessage:', err);
    try { res.sendStatus(500); } catch (e) { console.error('Failed to send error response', e); }
  }
};