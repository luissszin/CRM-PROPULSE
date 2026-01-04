import express from 'express';
import { receiveZapiMessage } from '../webhooks/zapiWebhook.js';

const router = express.Router();

router.post('/zapi', receiveZapiMessage);

export default router;
