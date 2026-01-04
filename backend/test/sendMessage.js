import dotenv from 'dotenv';
import axios from 'axios';
import { sendZapiMessage } from '../services/zapiService.js';
import normalizePhone from '../utils/phone.js';
import logger from '../utils/logger.js';

dotenv.config();

// Test data requested by user
const rawPhone = process.env.TEST_PHONE || '61982047227';
const text = process.env.TEST_MESSAGE || 'seja bem vindo, "posso lhe ajudar? "';

// Normalize phone: ensure it has Brazil country code (55)
const phone = normalizePhone(rawPhone);
if (!phone) {
  logger.error('Invalid phone after normalization:', rawPhone);
  process.exit(1);
}

async function tryPostToServer(phone, message) {
  try {
    const url = process.env.TEST_SERVER_URL || 'http://127.0.0.1:3000/messages';
    // retry with exponential backoff up to 5 attempts
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const resp = await axios.post(url, { phone, message }, { timeout: 5000 });
        return { ok: true, source: 'server', status: resp.status, data: resp.data };
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        const backoff = 200 * Math.pow(2, attempt - 1);
        logger.warn(`POST attempt ${attempt} failed, retrying in ${backoff}ms...`);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
    return { ok: false };
  } catch (err) {
    return { ok: false, error: err };
  }
}

(async () => {
  logger.info('Testing send flow for', phone);

  // First try: POST to local server endpoint (preferred)
  const serverResult = await tryPostToServer(phone, text);
  if (serverResult.ok) {
    console.log('POST /messages succeeded:', serverResult.status, serverResult.data);
    process.exit(0);
  }

  logger.warn('POST to server failed, falling back to direct send via zapiService:', serverResult.error?.message || serverResult.error);

  // Fallback: call sendZapiMessage directly (bypasses HTTP server)
  const ok = await sendZapiMessage(phone, text);
  logger.info('Direct sendZapiMessage returned:', ok);
  process.exit(ok ? 0 : 1);
})();