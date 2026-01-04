import logger from '../utils/logger.js';
import { supabase } from './supabaseService.js';
import { sendZapiMessage } from './zapiService.js';

let intervalId = null;

export function startRequeueWorker(opts = {}) {
  const intervalMs = opts.intervalMs || 60 * 1000; // default: 60s
  if (!supabase) {
    logger.warn('[requeueWorker] supabase not configured; worker will not start');
    return;
  }

  if (intervalId) return; // already running

  intervalId = setInterval(async () => {
    try {
      // find failed or pending messages older than 10s
      const cutoff = new Date(Date.now() - (10 * 1000)).toISOString();
      const { data: msgs, error } = await supabase.from('messages').select('*').in('status', ['failed', 'pending']).lt('created_at', cutoff).limit(50);
      if (error) {
        const msg = error.message || error;
        logger.warn('[requeueWorker] error fetching messages', msg);
        // If the error indicates a missing column/table in the DB schema, just warn once per startup or degrade gracefully
        if (typeof msg === 'string' && (msg.includes('does not exist') || msg.includes('column') || msg.includes('relation'))) {
          // logger.warn('[requeueWorker] specific schema error - messages.status missing. Worker functionality paused.');
          // Do not stop worker, just return to try again later (or never if it persists, but keeps app alive)
          return;
        }
        return;
      }
      if (!msgs || msgs.length === 0) return;

      logger.info(`[requeueWorker] attempting to re-send ${msgs.length} messages`);

      for (const m of msgs) {
        try {
          // get conversation and contact
          const { data: conv } = await supabase.from('conversations').select('*').eq('id', m.conversation_id).single();
          if (!conv) continue;
          const { data: contact } = await supabase.from('contacts').select('*').eq('id', conv.contact_id).single();
          if (!contact) continue;

          const ok = await sendZapiMessage(contact.phone, m.content);
          await supabase.from('messages').update({ status: ok ? 'sent' : 'failed' }).eq('id', m.id);
        } catch (e) {
          logger.warn('[requeueWorker] failed to resend message', e?.message ?? e);
        }
      }
    } catch (err) {
      logger.error('[requeueWorker] unexpected error', err?.message ?? err);
    }
  }, intervalMs);

  logger.info('[requeueWorker] started');
}

export function stopRequeueWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('[requeueWorker] stopped');
  }
}
