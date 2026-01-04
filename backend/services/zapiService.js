import axios from 'axios';
import logger from '../utils/logger.js';

// sendZapiMessage: tries to send using either a full ZAPI_SEND_URL (preferred) or constructs
// the URL from base + instance + token. It also sends the client token using several header
// name variants to increase compatibility with different API expectations.
export const sendZapiMessage = async (phone, text) => {
  // If developer wants to skip actual network calls (local testing without client token)
  if (process.env.ZAPI_SKIP_SEND && String(process.env.ZAPI_SKIP_SEND).toLowerCase() === 'true') {
    logger.info('[zapiService] ZAPI_SKIP_SEND enabled — skipping real send.');
    logger.info('[zapiService] would send to:', {
      phone,
      message: text,
      url: process.env.ZAPI_SEND_URL || `${process.env.ZAPI_BASE_URL}/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`
    });
    return true;
  }

  // If no client token is configured, we will auto-skip sending to keep app functional
  if (!process.env.ZAPI_CLIENT_TOKEN) {
    logger.warn('[zapiService] no ZAPI_CLIENT_TOKEN configured — simulating send to keep system functional.');
    logger.info('[zapiService] would send to:', {
      phone,
      message: text,
      url: process.env.ZAPI_SEND_URL || `${process.env.ZAPI_BASE_URL}/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`
    });
    return true;
  }

  try {
    const payload = { phone, message: text };

    const url = process.env.ZAPI_SEND_URL
      ? process.env.ZAPI_SEND_URL
      : `${process.env.ZAPI_BASE_URL}/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`;

    // Prepare headers with multiple variants for the client token
    const headers = {};
    if (process.env.ZAPI_CLIENT_TOKEN) {
      headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN;
      headers['client-token'] = process.env.ZAPI_CLIENT_TOKEN;
      headers['Authorization'] = `Bearer ${process.env.ZAPI_CLIENT_TOKEN}`;
    }

    const resp = await axios.post(url, payload, { headers });

    // Treat 2xx as success
    if (resp && resp.status >= 200 && resp.status < 300) {
      return true;
    }

    logger.warn('sendZapiMessage unexpected response:', resp.status, resp.data);
    return false;
  } catch (err) {
    // Log detailed info to help debugging (status/data when available)
    logger.error('sendZapiMessage failed:', err?.response?.status ?? err.message ?? err);
    if (err?.response?.data) logger.error('response data:', err.response.data);
    return false;
  }
};
