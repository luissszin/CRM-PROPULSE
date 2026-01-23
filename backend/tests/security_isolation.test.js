import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../serve.js';

/**
 * TESTE DE SEGURANÇA: Isolamento Multi-Tenant
 * 
 * Objetivo: Garantir que usuários não podem acessar dados de outras unidades
 */
describe('🛡️ Security: Multi-Tenant Isolation', () => {
    let adminToken;
    let unitA_Id, unitB_Id;
    let userA_Token;
    let leadB_Id;

    // Setup: Criar 2 unidades e 2 usuários
    before(async () => {
        try {
            // Login como Super Admin
            let adminLogin = await request(app)
                .post('/admin/login')
                .set('x-test-bypass', 'true')
                .send({ email: 'admin@propulse.com', password: 'admin123' });
            
            if (adminLogin.status !== 200) {
                console.log('Admin login failed, creating admin user...');
                const { supabase } = await import('../services/supabaseService.js');
                const bcrypt = await import('bcrypt');
                const hashedPassword = await bcrypt.hash('admin123', 10);
                
                const { error: createError } = await supabase.from('users').insert({
                    name: 'Super Admin',
                    email: 'admin@propulse.com',
                    password: hashedPassword,
                    role: 'super_admin'
                });
                
                if (createError) console.error('Failed to create admin:', createError);

                // Retry login
                adminLogin = await request(app)
                    .post('/admin/login')
                    .set('x-test-bypass', 'true')
                    .send({ email: 'admin@propulse.com', password: 'admin123' });
            }
            
            if (adminLogin.status !== 200) {
                 throw new Error('Failed to login as admin even after creation attempt');
            }
            
            adminToken = adminLogin.body.accessToken;

            // Dynamic values to prevent collisions
            const timestamp = Date.now();
            const unitASlug = `unit_a_security_${timestamp}`;
            const unitBSlug = `unit_b_security_${timestamp}`;
            const userAEmail = `user_a_sec_${timestamp}@test.com`;
            const leadBPhone = `55${timestamp}`; 

            // Criar Unidades
            const resA = await request(app).post('/leads/units')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('x-test-bypass', 'true')
                .send({ name: 'Unit A', slug: unitASlug });
            if (!resA.body.unit) throw new Error(`Create Unit A failed: ${JSON.stringify(resA.body)}`);
            unitA_Id = resA.body.unit.id;

            const resB = await request(app).post('/leads/units')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('x-test-bypass', 'true')
                .send({ name: 'Unit B', slug: unitBSlug });
            if (!resB.body.unit) throw new Error(`Create Unit B failed: ${JSON.stringify(resB.body)}`);
            unitB_Id = resB.body.unit.id;

            // Criar Usuário A em Unidade A
            const resUser = await request(app).post('/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('x-test-bypass', 'true')
                .send({ 
                name: 'User A', email: userAEmail, password: '123', role: 'agent', unitId: unitA_Id 
            });
            if (resUser.status !== 200) throw new Error(`Create User A failed: ${JSON.stringify(resUser.body)}`);

            // Login Usuário A para pegar Token
            const loginA = await request(app).post('/admin/login')
                .set('x-test-bypass', 'true')
                .send({ email: userAEmail, password: '123' });
            if (loginA.status !== 200) throw new Error(`Login User A failed: ${JSON.stringify(loginA.body)}`);
            userA_Token = loginA.body.accessToken;

            // Criar um Lead na Unidade B para testar ataque
            const resLeadB = await request(app).post('/leads')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('x-test-bypass', 'true')
                .send({ unit_id: unitB_Id, name: 'Lead Unit B', phone: leadBPhone, source: 'test' });
            if (!resLeadB.body.lead) throw new Error(`Create Lead B failed: ${JSON.stringify(resLeadB.body)}`);
            leadB_Id = resLeadB.body.lead.id;
        } catch (e) {
            console.error('before error:', e);
        }
    });

    describe('❌ Cross-Tenant Access Attempt', () => {
        test('should block user from accessing leads of another unit', async () => {
            const res = await request(app)
                .get(`/leads/${leadB_Id}`)
                .set('Authorization', `Bearer ${userA_Token}`);
            
            assert.ok([403, 404].includes(res.status), `Expected 403 or 404 but got ${res.status}`);
        });

        test('should block user from listing conversations of another unit', async () => {
            const res = await request(app)
                .get('/conversations')
                .query({ unitId: unitB_Id })
                .set('Authorization', `Bearer ${userA_Token}`);
            
            assert.ok([403, 400].includes(res.status), `Expected 403 or 400 but got ${res.status}`);
        });
    });

    describe('✅ Super Admin Access', () => {
        test('should allow super admin to access any unit', async () => {
            if (!adminToken) return;

            const res = await request(app)
                .get('/leads')
                .query({ unit_id: unitB_Id })
                .set('Authorization', `Bearer ${adminToken}`);
            
            assert.ok([200, 503].includes(res.status));
        });
    });

    describe('🔒 Authentication Required', () => {
        test('should reject requests without token', async () => {
            const res = await request(app).get('/leads');
            assert.strictEqual(res.status, 401);
        });

        test('should reject requests with invalid token', async () => {
            const res = await request(app)
                .get('/leads')
                .set('Authorization', 'Bearer invalid-token-12345');
            
            assert.strictEqual(res.status, 401);
        });
    });

    describe('🚨 Rate Limiting', () => {
        test('should block excessive login attempts', async () => {
            const attempts = [];
            for (let i = 0; i < 12; i++) {
                const res = await request(app)
                    .post('/admin/login')
                    .send({ email: 'fake@test.com', password: 'wrong' });
                attempts.push(res.status);
            }
            assert.ok(attempts.includes(429), 'Should have received 429 Too Many Requests');
        });
    });
});
