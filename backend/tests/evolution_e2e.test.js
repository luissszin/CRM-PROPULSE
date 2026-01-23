import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import request from 'supertest';
import { app } from '../serve.js'; // Ensure this exports 'app'
import { supabase } from '../services/supabaseService.js';

// Configuration
const MOCK_PORT = 9999;
process.env.EVOLUTION_API_BASE_URL = `http://localhost:${MOCK_PORT}`;
process.env.EVOLUTION_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';
process.env.ENABLE_TEST_BYPASS = 'true'; // Bypass rate limits

// Mock Evolution API Server
let mockServer;
let mockHits = {
    createInstance: 0,
    connect: 0,
    connectionState: 0,
    sendText: 0
};

function startMockServer() {
    return new Promise((resolve) => {
        mockServer = http.createServer((req, res) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const url = req.url;
                const method = req.method;
                
                // console.log(`[MockEvolution] ${method} ${url}`, body);

                res.setHeader('Content-Type', 'application/json');

                if (url === '/instance/create' && method === 'POST') {
                    mockHits.createInstance++;
                    const data = JSON.parse(body);
                    res.writeHead(201);
                    return res.end(JSON.stringify({ 
                        instance: { instanceName: data.instanceName, status: 'created' },
                        hash: { apikey: 'test' }
                    }));
                }

                if (url.startsWith('/instance/connect/') && method === 'GET') {
                    mockHits.connect++;
                    res.writeHead(200);
                    return res.end(JSON.stringify({ 
                        base64: 'data:image/png;base64,TESTQRCODE',
                        code: 'TESTQRCODE'
                    }));
                }

                if (url.startsWith('/instance/connectionState/') && method === 'GET') {
                    mockHits.connectionState++;
                    res.writeHead(200);
                    return res.end(JSON.stringify({ 
                        instance: { state: 'open', status: 'open' } 
                    }));
                }

                if (url.startsWith('/message/sendText/') && method === 'POST') {
                    mockHits.sendText++;
                    res.writeHead(200);
                    return res.end(JSON.stringify({ 
                        key: { id: 'msg_' + Date.now(), fromMe: true },
                        messageTimestamp: Date.now() / 1000
                    }));
                }
                
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

describe('Evolution WhatsApp Integration E2E', async () => {
    let adminToken;
    let unitId;
    let campaignId;
    
    before(async () => {
        await startMockServer();
        // Wait for DB to init (in-memory)
        await new Promise(r => setTimeout(r, 1000));
        
        const loginRes = await request(app)
            .post('/admin/login')
            .send({ email: 'admin@propulse.com', password: 'admin123' })
            .set('x-test-bypass', 'true');
            
        if (loginRes.status !== 200) {
            console.error('Login Failed:', loginRes.status, loginRes.body);
        }
        assert.equal(loginRes.status, 200, 'Login failed');
        adminToken = loginRes.body.token;
        
        // Get Unit ID (From login or fetch)
        const unitsRes = await request(app)
            .get('/admin/units')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-test-bypass', 'true');
            
        unitId = unitsRes.body[0].id;
    });

    after(() => {
        mockServer.close();
    });

    it('1. Should connect WhatsApp (Gen QR)', async () => {
        const res = await request(app)
            .post(`/units/${unitId}/whatsapp/connect`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-test-bypass', 'true')
            .send({
                provider: 'evolution',
                credentials: { instanceId: 'test_unit' }
            });

        assert.ok(res.status === 200 || res.status === 201);
        assert.ok(res.body.connection, 'No connection returned');
        assert.ok(mockHits.createInstance >= 1, 'Evolution API not called');
        
        // Check DB
        const { data: conn } = await supabase.from('unit_whatsapp_connections').select('*').eq('unit_id', unitId).single();
        assert.ok(conn, 'Connection not saved in DB');
        assert.equal(conn.provider, 'evolution');
    });

    it('2. Should Request QR Code explicitly', async () => {
        const res = await request(app)
            .get(`/units/${unitId}/whatsapp/qrcode`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-test-bypass', 'true');

        assert.equal(res.status, 200);
        assert.ok(res.body.qrcode, 'QR Code missing'); 
        assert.equal(res.body.qrcode, 'data:image/png;base64,TESTQRCODE');
    });
    
    it('3. Should Handle status webhook (Connected)', async () => {
        const { data: conn } = await supabase.from('unit_whatsapp_connections').select('*').eq('unit_id', unitId).single();
        
        const webhookPayload = {
            event: 'connection.update',
            instance: conn.instance_id,
            data: {
                connection: 'open',
                statusReason: 200
            }
        };

        const res = await request(app)
            .post(`/webhooks/whatsapp/evolution/${conn.webhook_secret}`)
            .send(webhookPayload);
            
        assert.equal(res.status, 200);

        // Verify DB update
        const { data: updated } = await supabase.from('unit_whatsapp_connections').select('*').eq('unit_id', unitId).single();
        assert.equal(updated.status, 'connected');
    });

    it('4. Should Send Outbound Message', async () => {
        const res = await request(app)
            .post(`/units/${unitId}/whatsapp/send`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-test-bypass', 'true')
            .send({
                phone: '5511999999999',
                message: 'Hello World'
            });

        assert.equal(res.status, 200);
        assert.ok(res.body.id, 'Message ID expected');
        assert.ok(mockHits.sendText >= 1, 'Mock sendText not called');
    });

    it('5. Should Receive Inbound Message', async () => {
         const { data: conn } = await supabase.from('unit_whatsapp_connections').select('*').eq('unit_id', unitId).single();
         
         const inboundPayload = {
            event: 'messages.upsert',
            instance: conn.instance_id,
            data: {
                key: { remoteJid: '551188888888@s.whatsapp.net', fromMe: false, id: '12345ABC' },
                pushName: 'Tester',
                message: { conversation: 'Inbound Test' },
                messageTimestamp: Date.now() / 1000
            }
         };

         const res = await request(app)
            .post(`/webhooks/whatsapp/evolution/${conn.webhook_secret}`)
            .send(inboundPayload);
            
         assert.equal(res.status, 200);

         // Verify Message Saved
         const { data: msg } = await supabase
            .from('messages')
            .select('*')
            .eq('external_id', '12345ABC')
            .single();
            
         assert.ok(msg, 'Message not saved');
         assert.equal(msg.content, 'Inbound Test');
    });

    it('6. Should Create and Dispatch Campaign', async () => {
        // Ensure we have contacts
        const { data: contact } = await supabase.from('contacts').insert({ phone: '551177777777', name: 'Campaign Target' }).select().single();

        // Create
        const createRes = await request(app)
            .post(`/api/campaigns`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-test-bypass', 'true')
            .send({
                name: 'Test Campaign',
                content: 'Promo Message',
                contactIds: [contact.id]
            });
            
        assert.equal(createRes.status, 201);
        campaignId = createRes.body.id;

        // Dispatch
        const dispatchRes = await request(app)
            .post(`/api/campaigns/${campaignId}/dispatch`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-test-bypass', 'true');
            
        assert.equal(dispatchRes.status, 200);
        
        // Wait for async dispatch (it runs in background but in-process awaitable in service if we waited, 
        // but route backgrounded it. However, for test, let's wait a bit or verify side effects)
        
        await new Promise(r => setTimeout(r, 2500)); // Wait for 2s delay + execution

        const { data: camp } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
        assert.equal(camp.status, 'completed', 'Campaign status should be completed');
        assert.ok(mockHits.sendText >= 2, 'Should have sent another message');
    });

});
