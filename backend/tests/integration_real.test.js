import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseService.js';
import { app } from '../serve.js';

const TEST_SECRET = process.env.JWT_ACCESS_SECRET;

describe('🚀 Real Integration Flow Tests', () => {
    after(async () => {
        // Clean exit to close open handles (e.g. metrics interval)
        process.exit(0);
    });

    let adminToken, agentToken;
    let webhookSecret;
    const testPhone = '5511999887766';
    const uniqueId = Date.now().toString();

    before(async () => {
        // 1. Create Unit
        const { data: unit } = await supabase.from('units').insert({
            name: `Integration Test Unit ${uniqueId}`,
            slug: `integ_test_${uniqueId}`,
            metadata: { active: true }
        }).select().single();
        unitId = unit.id;

        // 2. Create Users
        // Admin
        const { data: adminUser } = await supabase.from('users').insert({
            name: 'Integration Admin',
            email: `admin_${uniqueId}@test.com`,
            password: 'hashed_pass_placeholder',
            role: 'super_admin'
        }).select().single();
        
        // Agent
        const { data: agentUser } = await supabase.from('users').insert({
            name: 'Integration Agent',
            email: `agent_${uniqueId}@test.com`,
            password: 'hashed_pass_placeholder',
            role: 'agent',
            unit_id: unitId
        }).select().single();

        adminToken = generateToken({ id: adminUser.id, role: 'super_admin' });
        agentToken = generateToken({ id: agentUser.id, role: 'agent', unitId: unitId });

        // 3. Setup Webhook Connection
        webhookSecret = `secret_${uniqueId}`;
        await supabase.from('unit_whatsapp_connections').insert({
            unit_id: unitId,
            provider: 'evolution',
            instance_id: `inst_${uniqueId}`,
            status: 'connected',
            webhook_secret: webhookSecret,
            provider_config: { apiKey: 'test' }
        });
    });

    describe('🔑 Auth & Access Control (Leads)', () => {
        test('GET /leads requires auth', async () => {
            const res = await request(app).get('/leads');
            assert.strictEqual(res.status, 401);
        });

        test('GET /leads accepts valid token', async () => {
            const res = await request(app)
                .get('/leads')
                .set('Authorization', `Bearer ${agentToken}`)
                .set('x-test-bypass', 'true');
            assert.strictEqual(res.status, 200);
        });

        test('GET /leads with invalid role/permission (cross-tenant check)', async () => {
            const res = await request(app)
                .post('/leads/units') 
                .set('Authorization', `Bearer ${agentToken}`)
                .set('x-test-bypass', 'true')
                .send({ name: 'Fail Unit', slug: 'fail' });

             assert.strictEqual(res.status, 403);
        });
    });

    describe('📡 WhatsApp Webhooks', () => {
        test('POST /webhooks/whatsapp/evolution/:secret with INVALID secret returns 401', async () => {
            const res = await request(app)
                .post('/webhooks/whatsapp/evolution/wrong_secret')
                .set('x-test-bypass', 'true')
                .send({ event: 'messages.upsert', data: {} });
            
            assert.strictEqual(res.status, 401);
        });

        test('POST /webhooks/whatsapp/invalid_provider/:secret returns 400', async () => {
            const res = await request(app)
                .post(`/webhooks/whatsapp/fake_provider/${webhookSecret}`)
                .set('x-test-bypass', 'true')
                .send({});
            
            assert.strictEqual(res.status, 400);
        });

        test('POST /webhooks/whatsapp/evolution/:secret with VALID payload returns 200', async () => {
            const payload = {
                event: 'messages.upsert',
                data: {
                    messages: [{
                        key: { remoteJid: `${testPhone}@s.whatsapp.net`, id: `msg_${Date.now()}`, fromMe: false },
                        pushName: 'Test Contact',
                        message: { conversation: 'Hello Integration Check' },
                        messageTimestamp: Math.floor(Date.now() / 1000)
                    }]
                }
            };

            const res = await request(app)
                .post(`/webhooks/whatsapp/evolution/${webhookSecret}`)
                .set('x-test-bypass', 'true') 
                .send(payload);
            
            if (res.status !== 200) {
                 console.error('Test Failed 500 Body:', JSON.stringify(res.body, null, 2));
            }
            assert.strictEqual(res.status, 200);

            // Verify side effects
            const { data: dbMsg } = await supabase.from('messages')
                .select('*, conversation:conversations(*)')
                .eq('content', 'Hello Integration Check')
                .single();
            
            assert.ok(dbMsg, 'Message should be persisted in DB');
            assert.strictEqual(dbMsg.conversation.unit_id, unitId);
        });
    });

    describe('🛡️ Rate Limits', () => {
        test('Should BLOCK requests without bypass header when flooded', async () => {
            const loginUrl = '/admin/login';
            const responses = [];
            
            for (let i = 0; i < 7; i++) {
                const res = await request(app)
                    .post(loginUrl)
                    .send({ email: 'flood@test.com', password: 'wrong' });
                responses.push(res.status);
            }
            
            assert.ok(responses.includes(429), 'Should have hit rate limit (status 429)');
        });

        test('Should ALLOW requests WITH bypass header even if flooded', async () => {
             const loginUrl = '/admin/login';
             const responses = [];
             
             for (let i = 0; i < 7; i++) {
                 const res = await request(app)
                     .post(loginUrl)
                     .set('x-test-bypass', 'true') 
                     .send({ email: 'flood_bypass@test.com', password: 'wrong' });
                 responses.push(res.status);
             }
             
             const hitRateLimit = responses.includes(429);
             assert.strictEqual(hitRateLimit, false, 'Should NOT hit rate limit using bypass header');
        });
    });
});
