import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import { initSocket } from './services/socketService.js';

import zapiRoutes from './routes/zapi.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import contactsRoutes from './routes/contacts.js';
import conversationsRoutes from './routes/conversations.js';
import leadsRoutes from './routes/leads.js';
import inboxRoutes from './routes/inbox.js';
import whatsappRoutes from './routes/whatsapp.js';
import webhookRoutes from './routes/webhooks.js';
import automationRoutes from './routes/automation.js';
import dashboardRoutes from './routes/dashboard.js';
// NEW: Unified WhatsApp integration routes
import whatsappConnectionRoutes from './routes/whatsappConnection.js';
import whatsappWebhookRoutes from './routes/whatsappWebhook.js';
import { apiLimiter, loginLimiter, webhookLimiter } from './middleware/rateLimiter.js';
import { startRequeueWorker } from './services/requeueWorker.js';
import { supabase } from './services/supabaseService.js';

// Global process guards to avoid crashing the whole app on unexpected errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // do not exit - try to keep the server running; log and continue
});

// basic env check - warn but don't crash
const requiredEnvs = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = requiredEnvs.filter(k => !process.env[k]);
if (missing.length) {
  console.warn('Warning: missing required env vars:', missing.join(', '));
}

const app = express();

// Trust proxy for rate limiting behind load balancers (Railway, Heroku, etc)
app.set('trust proxy', 1);

// middlewares básicos
app.use(cors());
app.use(express.json());

// ✅ RATE LIMITING GLOBAL (prevenir abuso)
app.use(apiLimiter);

// rotas
app.use('/webhook', zapiRoutes);     // Z-API bate aqui
app.use('/messages', messageRoutes); // Lovable usa isso pra enviar msg
app.use('/admin', adminRoutes);
app.use('/contacts', contactsRoutes);
app.use('/conversations', conversationsRoutes);
app.use('/leads', leadsRoutes);
app.use('/inbox', inboxRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/automation', automationRoutes);
app.use('/dashboard', dashboardRoutes);
// NEW: Unified WhatsApp integration routes
app.use('/units', whatsappConnectionRoutes);
app.use('/webhooks/whatsapp', whatsappWebhookRoutes);

// Seed minimal demo data when using in-memory DB (helpful for local dev)
// Comprehensive In-Memory DB Initialization
(async () => {
  try {
    if (supabase && supabase._inmemory) {
      console.log('Initializing In-Memory DB...');

      // 1. Units
      let u = await supabase.from('units').select().then(r => r.data?.[0]);
      if (!u) {
        const { data } = await supabase.from('units').insert({
          name: 'Demo Unit',
          slug: 'demo',
          metadata: { active: true, customFields: [] }
        }).select();
        u = data?.[0];
        console.log('Created table: units');
      }

      // 2. Users (Fixes Agent Login Test)
      const users = await supabase.from('users').select();
      if (!users.data || users.data.length === 0) {
        const hashedPassword = await bcrypt.hash('123', 10);
        await supabase.from('users').insert({
          name: 'Agente Demo',
          email: 'agente@propulse.com',
          password: hashedPassword,
          role: 'agent',
          unit_id: u?.id || null,
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Agente'
        });
        
        // Add Super Admin for tests
        await supabase.from('users').insert({
          name: 'Super Admin',
          email: 'admin@propulse.com',
          password: await bcrypt.hash('admin123', 10),
          role: 'super_admin',
          unit_id: null
        });
        console.log('Created table: users (added admin)');
      }

      // 3. Contacts (Required for leads)
      const contacts = await supabase.from('contacts').select();
      if (!contacts.data || contacts.data.length === 0) {
        await supabase.from('contacts').insert({ phone: '5511999999999', name: 'Contato Demo' });
        console.log('Created table: contacts');
      }

      // 4. Leads (Fixes Admin Login Sync)
      const leads = await supabase.from('leads').select();
      if (!leads.data || leads.data.length === 0) {
        if (u) {
          await supabase.from('leads').insert({
            unit_id: u.id,
            name: 'Lead Demo',
            phone: '11999999999',
            status: 'new',
            email: 'lead@demo.com',
            value: 1000,
            source: 'manual'
          });
          console.log('Created table: leads');
        }
      }

      // 5. Conversations & Messages (Just ensure tables exist via empty select)
      await supabase.from('conversations').select().limit(1);
      await supabase.from('messages').select().limit(1);
      console.log('In-Memory DB initialized successfully.');
    }
  } catch (e) {
    console.error('In-Memory DB Init Failed:', e);
  }
})();

// start background requeue worker (non-blocking)
startRequeueWorker();

// health check (opcional, mas profissional)
app.get('/health', (req, res) => {
  res.send('🚀 CRM Backend rodando');
});

// If a built frontend exists at ./frontend/dist, serve it as static files (production mode)
try {
  const frontendDist = path.join(process.cwd(), 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    // fallback to index.html for SPA routes — avoid express path parsing issues by using middleware
    app.use((req, res, next) => {
      try {
        if (req.method === 'GET' && req.headers.accept && req.headers.accept.includes('text/html')) {
          return res.sendFile(path.join(frontendDist, 'index.html'));
        }
      } catch (e) {
        console.warn('Error serving SPA fallback:', e?.message ?? e);
      }
      return next();
    });
    console.log('Serving frontend from', frontendDist);
  }
} catch (e) {
  console.warn('Could not enable static frontend serving:', e?.message ?? e);
}

// servidor
const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});

// Centralized error-handling middleware (catches errors passed to next(err))
app.use((err, req, res, next) => {
  try {
    console.error('Express error handler caught:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Internal Server Error' });
  } catch (e) {
    console.error('Error while handling error:', e);
    // if even the handler fails, attempt to close the response
    try { res.sendStatus(500); } catch (_) { }
  }
});
