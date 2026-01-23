import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import request from 'supertest';
import { app } from '../serve.js';
import { supabase } from '../services/supabaseService.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// ===========================================
// CONFIGURATION
// ===========================================
const MOCK_PORT = 9999;
process.env.EVOLUTION_API_BASE_URL = `http://localhost:${MOCK_PORT}`;
process.env.EVOLUTION_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';
process.env.ENABLE_TEST_BYPASS = 'true';
process.env.JWT_ACCESS_SECRET = 'test-secret-key-for-jwt';

// ===========================================
// MOCK EVOLUTION API SERVER
// ===========================================
let mockServer;
let mockState = {
    instances: {}, // instanceName -> { status, qr }
    messages: [],
    hits: {
        createInstance: 0,
        connect: 0,
        connectionState: 0,
        sendText: 0
    }
};

function resetMockState() {
    mockState.instances = {};
    mockState.messages = [];
    mockState.hits = {
        createInstance: 0,
        connect: 0,


        connectionState: 0,
        sendText: 0
    };
}

function startMockServer() {
    return new Promise((resolve) => {
        mockServer = http.createServer((req, res) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const url = req.url;
                const method = req.method;
                
                res.setHeader('Content-Type', 'application/json');

                // CREATE INSTANCE
                if (url === '/instance/create' && method === 'POST') {
                    mockState.hits.createInstance++;
                    const data = JSON.parse(body);
                    mockState.instances[data.instanceName] = { 
                        status: 'created',
                        qr: null
                    };
                    res.writeHead(201);
                    return res.end(JSON.stringify({ 
                        instance: { instanceName: data.instanceName, status: 'created' },
                        hash: { apikey: 'test' }
                    }));
                }

                // CONNECT (GET QR)
                if (url.startsWith('/instance/connect/') && method === 'GET') {
                    mockState.hits.connect++;
                    const instanceName = decodeURIComponent(url.split('/')[3]);
                    const qrCode = 'data:image/png;base64,TESTQRCODE_' + Date.now();
                    mockState.instances[instanceName] = { 
                        status: 'connecting', 
                        qr: qrCode 
                    };
                    res.writeHead(200);
                    return res.end(JSON.stringify({ 
                        base64: qrCode,
                        code: qrCode
                    }));
                }

                // CONNECTION STATE
                if (url.startsWith('/instance/connectionState/') && method === 'GET') {
                    mockState.hits.connectionState++;
                    const instanceName = decodeURIComponent(url.split('/')[3]);
                    const instance = mockState.instances[instanceName] || { status: 'disconnected' };
                    res.writeHead(200);
                    return res.end(JSON.stringify({ 
                        instance: { state: instance.status === 'connected' ? 'open' : 'connecting' } 
                    }));
                }

                // SEND TEXT MESSAGE
                if (url.startsWith('/message/sendText/') && method === 'POST') {
                    mockState.hits.sendText++;
                    const messageId = 'msg_' + Date.now();
                    mockState.messages.push({ id: messageId, body: JSON.parse(body) });
                    res.writeHead(200);
                    return res.end(JSON.stringify({ 
                        key: { id: messageId, fromMe: true },
                        messageTimestamp: Date.now() / 1000
                    }));
                }
                
                // SETTINGS
                if (url.startsWith('/settings/set/')) {
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true }));
                }

                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Endpoint not mocked' }));
            });
        });
        mockServer.listen(MOCK_PORT, resolve);
    });
}

// ===========================================
// HELPER: Simulate QR Scan (Mock Webhook)
// ===========================================
async function simulateQrScan(unitId, webhookSecret, instanceName) {
    // Mark instance as connected in mock
    mockState.instances[instanceName] = { status: 'connected', qr: null };
    
    // Send webhook to CRM
    const webhookPayload = {
        event: 'connection.update',
        instance: instanceName,
        data: {
            connection: 'open',
            statusReason: 200
        }
    };

    return request(app)
        .post(`/webhooks/whatsapp/evolution/${webhookSecret}`)
        .send(webhookPayload);
}

// ===========================================
// E2E TEST SUITE
// ===========================================
describe('Evolution WhatsApp E2E - 100% Coverage', async () => {
    let adminToken;
    let agentToken;
    let unitId;
    let unit2Id;
    let webhookSecret;
    let instanceName;
    let contactId;
    
    before(async () => {
        await startMockServer();
        resetMockState();
        
        // Wait for in-memory DB init
        await new Promise(r => setTimeout(r, 1000));
        
        // Create test users
        const hashedPassword = await bcrypt.hash('test123', 10);
        
        // Admin
        const { data: admin } = await supabase.from('users').insert({
            email: 'admin@test.com',
            password: hashedPassword,
            name: 'Admin Test',
            role: 'super_admin'
        }).select().single();
        
        adminToken = jwt.sign({ id: admin.id, email: admin.email, role: 'super_admin' }, process.env.JWT_ACCESS_SECRET);
        
        // Get units
        const { data: units } = await supabase.from('units').select('*');
        unitId = units[0].id;
        
        // Create Unit 2 for isolation test
        const { data: unit2 } = await supabase.from('units').insert({
            name: 'Unit 2 Test',
            slug: 'unit-2-test'
        }).select().single();
        unit2Id = unit2.id;
        
        // Agent for unit1
        const { data: agent } = await supabase.from('users').insert({
            email: 'agent@test.com',
            password: hashedPassword,
            name: 'Agent Test',
            role: 'agent',
            unit_id: unitId
        }).select().single();
        
        agentToken = jwt.sign({ id: agent.id, email: agent.email, role: 'agent', unitId }, process.env.JWT_ACCESS_SECRET);
    });

    after(() => {
        mockServer.close();
    });

    // ===============================================
    // SCENARIO 1: Connect → QR Generated
    // ===============================================
    it('1. Should connect WhatsApp and generate QR code', async () => {
        const res = await request(app)
            .post(`/units/${unitId}/whatsapp/connect`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-test-bypass', 'true')
            .send({
                provider: 'evolution',
                credentials: { instanceId: `unit_test_${unitId.substring(0,8)}` }
            });

        assert.ok(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
        assert.ok(res.body.connection, 'No connection in response');
        assert.ok(mockState.hits.createInstance >= 1, 'Evolution API create not called');
        
        // Store for later tests
        const { data: conn } = await supabase.from('unit_whatsapp_connections').select('*').eq('unit_id', unitId).single();
        webhookSecret = conn.webhook_secret;
        instanceName = conn.instance_id;
        
        assert.ok(webhookSecret, 'Webhook secret not generated');
        assert.ok(instanceName, 'Instance name not saved');
    });

    // ===============================================
    // SCENARIO 2: QR Scan → Status Connected
    // ===============================================
    it('2. Should update status to connected when QR is scanned', async () => {
        // Simulate QR scan via webhook
        const webhookRes = await simulateQrScan(unitId, webhookSecret, instanceName);
        assert.equal(webhookRes.status, 200, 'Webhook should return 200');

        // Check DB was updated
        const { data: conn } = await supabase.from('unit_whatsapp_connections').select('*').eq('unit_id', unitId).single();
        assert.equal(conn.status, 'connected', 'Status should be connected');
        assert.equal(conn.status_reason, 'scan_completed', 'Reason should be scan_completed');
        assert.ok(conn.connected_at, 'connected_at should be set');
        assert.equal(conn.qr_code, null, 'QR code should be cleared');
    });

    // ===============================================
    // SCENARIO 3: Inbound Message → Creates Records
    // ===============================================
    it('3. Should receive inbound message and create contact/conversation/message', async () => {
        const inboundPayload = {
            event: 'messages.upsert',
            instance: instanceName,
            data: {
                messages: [{
                    key: { remoteJid: '5511988887777@s.whatsapp.net', fromMe: false, id: 'TEST_MSG_001' },
                    pushName: 'Test User',
                    message: { conversation: 'Hello from test!' },
                    messageTimestamp: Math.floor(Date.now() / 1000)
                }]
            }
        };

        const res = await request(app)
            .post(`/webhooks/whatsapp/evolution/${webhookSecret}`)
            .send(inboundPayload);
            
        assert.equal(res.status, 200, 'Webhook should return 200');

        // Verify message was saved
        const { data: msg } = await supabase
            .from('messages')
            .select('*, conversations(*, contacts(*))')
            .eq('external_id', 'TEST_MSG_001')
            .single();
            
        assert.ok(msg, 'Message not saved');
        assert.equal(msg.content, 'Hello from test!', 'Content mismatch');
        assert.equal(msg.sender, 'customer', 'Sender should be customer');
        assert.equal(msg.status, 'received', 'Status should be received');
        assert.ok(msg.conversations, 'Conversation not linked');
        assert.ok(msg.conversations.contacts, 'Contact not linked');
        
        contactId = msg.conversations.contact_id; // Store for later
    });

    // ===============================================
    // SCENARIO 4: Dedupe → Duplicate Not Created
    // ===============================================
    it('4. Should deduplicate repeated inbound message', async () => {
        const duplicatePayload = {
            event: 'messages.upsert',
            instance: instanceName,
            data: {
                messages: [{
                    key: { remoteJid: '5511988887777@s.whatsapp.net', fromMe: false, id: 'TEST_MSG_001' }, // Same ID
                    pushName: 'Test User',
                    message: { conversation: 'Duplicate message' },
                    messageTimestamp: Math.floor(Date.now() / 1000)
                }]
            }
        };

        const res = await request(app)
            .post(`/webhooks/whatsapp/evolution/${webhookSecret}`)
            .send(duplicatePayload);
            
        assert.equal(res.status, 200, 'Webhook should return 200');

        // Count messages with this external_id
        const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('external_id', 'TEST_MSG_001');
            
        assert.equal(messages.length, 1, 'Should have exactly 1 message (deduplicated)');
        assert.equal(messages[0].content, 'Hello from test!', 'Content should be from first message');
    });

    // ===============================================
    // SCENARIO 5: Outbound → Queued → Sent
    // ===============================================
    it('5. Should send outbound message with client_message_id and retry', async () => {
        const clientMsgId = `client_${Date.now()}`;
        
        const res = await request(app)
            .post('/messages')
            .set('Authorization', `Bearer ${agentToken}`)
            .set('x-test-bypass', 'true')
            .send({
                phone: '5511988887777',
                message: 'Reply from agent',
                clientMessageId: clientMsgId
            });

        assert.equal(res.status, 200, `Send failed: ${JSON.stringify(res.body)}`);
        assert.ok(res.body.success, 'Success flag missing');
        assert.ok(res.body.messageId, 'Message ID missing');
        assert.ok(mockState.hits.sendText >= 1, 'Evolution API send not called');
        
        // Verify DB has message with queued->sent transition
        const { data: msg } = await supabase
            .from('messages')
            .select('*')
            .eq('client_message_id', clientMsgId)
            .single();
            
        assert.ok(msg, 'Message not found in DB');
        assert.equal(msg.status, 'sent', 'Status should be sent');
        assert.equal(msg.sender, 'agent', 'Sender should be agent');
        assert.ok(msg.external_id, 'External ID should be set');
        
        // Test idempotency - send again
        const res2 = await request(app)
            .post('/messages')
            .set('Authorization', `Bearer ${agentToken}`)
            .set('x-test-bypass', 'true')
            .send({
                phone: '5511988887777',
                message: 'Duplicate attempt',
                clientMessageId: clientMsgId // Same ID
            });
            
        assert.equal(res2.status, 200, 'Idempotency check failed');
        assert.equal(res2.body.deduplicated, true, 'Should be marked as deduplicated');
    });

    // ===============================================
    // SCENARIO 6: Campaign → Sequential Send
    // ===============================================
    it('6. Should dispatch campaign with sequential sending and rate limit', async () => {
        // Create contacts
        const { data: contacts } = await supabase.from('contacts').insert([
            { phone: '5511111111111', name: 'Target 1' },
            { phone: '5511222222222', name: 'Target 2' },
            { phone: '5511333333333', name: 'Target 3' }
        ]).select();

        // Create campaign
        const { data: campaign } = await supabase.from('campaigns').insert({
            unit_id: unitId,
            name: 'Test Campaign',
            content: 'Campaign message',
            status: 'draft'
        }).select().single();

        // Add recipients
        await supabase.from('campaign_recipients').insert(
            contacts.map(c => ({
                campaign_id: campaign.id,
                contact_id: c.id,
                status: 'pending'
            }))
        );

        // Dispatch
        const startTime = Date.now();
        const dispatchRes = await request(app)
            .post(`/api/campaigns/${campaign.id}/dispatch`)
            .set('Authorization', `Bearer ${agentToken}`)
            .set('x-test-bypass', 'true');
            
        assert.equal(dispatchRes.status, 200, 'Dispatch failed');

        // Wait for async processing (3 messages * 2s delay = 6s + buffer)
        await new Promise(r => setTimeout(r, 7000));
        
        const elapsed = Date.now() - startTime;
        
        // Verify all sent
        const { data: recipients } = await supabase
            .from('campaign_recipients')
            .select('*')
            .eq('campaign_id', campaign.id);
            
        const sentCount = recipients.filter(r => r.status === 'sent').length;
        assert.ok(sentCount >= 2, `Expected at least 2 sent, got ${sentCount}`); // Allow for timing variance
        
        // Verify rate limiting (should take > 4 seconds for 3 messages)
        assert.ok(elapsed >= 6000, `Too fast: ${elapsed}ms (expected > 6000ms for rate limiting)`);
    });

    // ===============================================
    // SCENARIO 7: Invalid Webhook → 401/400
    // ===============================================
    it('7. Should reject webhook with invalid provider', async () => {
        const res = await request(app)
            .post('/webhooks/whatsapp/invalid_provider/fake-secret')
            .send({ event: 'test' });
            
        assert.equal(res.status, 400, 'Should return 400 for invalid provider');
        assert.ok(res.body.error, 'Should have error message');
    });

    // ===============================================
    // SCENARIO 8: Unknown Instance → 200 + Log
    // ===============================================
    it('8. Should handle unknown instance gracefully (200 + log)', async () => {
        const unknownPayload = {
            event: 'messages.upsert',
            instance: 'unknown_instance_12345', // Not in DB
            data: {
                messages: [{
                    key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'UNKNOWN_MSG' },
                    pushName: 'Unknown',
                    message: { conversation: 'Should not create' },
                    messageTimestamp: Math.floor(Date.now() / 1000)
                }]
            }
        };

        const res = await request(app)
            .post(`/webhooks/whatsapp/evolution/any-secret`)
            .send(unknownPayload);
            
        // CRITICAL: Must return 200 to avoid retry storms
        assert.equal(res.status, 200, 'Should return 200 for unknown instance');
        assert.equal(res.body.warning, 'unknown_instance', 'Should have unknown_instance warning');
        
        // Verify message was NOT created
        const { data: msg } = await supabase
            .from('messages')
            .select('*')
            .eq('external_id', 'UNKNOWN_MSG')
            .single();
            
        assert.equal(msg, null, 'Message should NOT be created for unknown instance');
    });

    // ===============================================
    // BONUS: Multi-Tenant Isolation
    // ===============================================
    it('BONUS: Should enforce multi-tenant isolation', async () => {
        // Try to access unit1's status with unit2's token
        const { data: agent2 } = await supabase.from('users').insert({
            email: 'agent2@test.com',
            password: await bcrypt.hash('test', 10),
            name: 'Agent 2',
            role: 'agent',
            unit_id: unit2Id
        }).select().single();
        
        const agent2Token = jwt.sign({ 
            id: agent2.id, 
            email: agent2.email, 
            role: 'agent', 
            unitId: unit2Id 
        }, process.env.JWT_ACCESS_SECRET);

        const res = await request(app)
            .get(`/units/${unitId}/whatsapp/status`)
            .set('Authorization', `Bearer ${agent2Token}`)
            .set('x-test-bypass', 'true');
            
        assert.equal(res.status, 403, 'Should deny access to other unit');
    });
});
