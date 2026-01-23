import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { supabase } from '../services/supabaseService.js';
import { app } from '../serve.js';

describe('Evolution Webhook & Idempotency', () => {
    let unitId;
    let webhookSecret = 'evolution_secret_test';
    let externalId = 'EXT_ID_12345';
    const TEST_PHONE = '5511999887766';

    before(async () => {
        // Create Unit & Connection
        const { data: unit } = await supabase.from('units').insert({
            name: 'Evolution Test Unit',
            slug: 'evo_test',
            metadata: { active: true }
        }).select().single();
        unitId = unit.id;

        await supabase.from('unit_whatsapp_connections').insert({
            unit_id: unitId,
            provider: 'evolution',
            instance_id: 'evo_inst_1',
            status: 'connected',
            webhook_secret: webhookSecret,
            provider_config: { apiKey: 'test' }
        });
    });

    after(() => {
        process.exit(0);
    });

    test('should reject invalid secret with 401', async () => {
        const res = await request(app)
            .post('/webhooks/whatsapp/evolution/invalid_secret')
            .send({});
        assert.strictEqual(res.status, 401);
    });

    test('should process valid inbound message and create record', async () => {
        const payload = {
            event: 'messages.upsert',
            data: {
                messages: [{
                    key: { 
                        remoteJid: `${TEST_PHONE}@s.whatsapp.net`, 
                        id: externalId, 
                        fromMe: false 
                    },
                    pushName: 'Evo Tester',
                    message: { conversation: 'First Message' },
                    messageTimestamp: Math.floor(Date.now() / 1000)
                }]
            }
        };

        const res = await request(app)
            .post(`/webhooks/whatsapp/evolution/${webhookSecret}`)
            .send(payload);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);

        // Verify DB
        const { data: msg } = await supabase.from('messages')
            .select('*')
            .eq('external_id', externalId)
            .single();
        
        assert.ok(msg, 'Message should exist');
        assert.strictEqual(msg.content, 'First Message');
        assert.strictEqual(msg.status, 'received');
        assert.strictEqual(msg.provider, 'evolution');
    });

    test('should deduplicate repeated message (idempotency)', async () => {
        const payload = {
            event: 'messages.upsert',
            data: {
                messages: [{
                    key: { 
                        remoteJid: `${TEST_PHONE}@s.whatsapp.net`, 
                        id: externalId, // SAME ID
                        fromMe: false 
                    },
                    pushName: 'Evo Tester',
                    message: { conversation: 'First Message Repeated' },
                    messageTimestamp: Math.floor(Date.now() / 1000)
                }]
            }
        };

        const res = await request(app)
            .post(`/webhooks/whatsapp/evolution/${webhookSecret}`)
            .send(payload);

        assert.strictEqual(res.status, 200);
        // Should return dedup: true if implementation allows returning details, 
        // OR just check that count is still 1.
        
        const { data: msgs } = await supabase.from('messages')
            .select('*')
            .eq('external_id', externalId);
            
        assert.strictEqual(msgs.length, 1, 'Should NOT create duplicate message');
    });
});
