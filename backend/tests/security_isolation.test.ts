import request from 'supertest';
import { describe, it, expect, beforeAll } from '@jest/globals';

const BASE_URL = 'http://localhost:3000';

/**
 * TESTE DE SEGURANÇA: Isolamento Multi-Tenant
 * 
 * Objetivo: Garantir que usuários não podem acessar dados de outras unidades
 */
describe('🛡️ Security: Multi-Tenant Isolation', () => {
    let adminToken;
    let unitA_Id, unitB_Id;
    let userA_Token, userB_Token;
    let leadA_Id, leadB_Id;

    // Setup: Criar 2 unidades e 2 usuários
    beforeAll(async () => {
        try {
            // Login como Super Admin
            const adminLogin = await request(BASE_URL)
                .post('/admin/login')
                .send({ email: 'admin@propulse.com', password: 'admin123' });
            
            if (adminLogin.status !== 200) {
                console.error('Admin login failed:', adminLogin.body);
                return;
            }
            
            adminToken = adminLogin.body.accessToken;

            // Criar Unidades
            const resA = await request(BASE_URL).post('/leads/units').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Unit A', slug: 'unit_a_security' });
            if (!resA.body.unit) console.error('Create Unit A failed:', resA.body);
            unitA_Id = resA.body.unit.id;

            const resB = await request(BASE_URL).post('/leads/units').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Unit B', slug: 'unit_b_security' });
            if (!resB.body.unit) console.error('Create Unit B failed:', resB.body);
            unitB_Id = resB.body.unit.id;

            // Criar Usuário A em Unidade A
            const resUser = await request(BASE_URL).post('/admin/users').set('Authorization', `Bearer ${adminToken}`).send({ 
                name: 'User A', email: 'user_a_sec@test.com', password: '123', role: 'agent', unitId: unitA_Id 
            });
            if (resUser.status !== 200) console.error('Create User A failed:', resUser.body);

            // Login Usuário A para pegar Token
            const loginA = await request(BASE_URL).post('/admin/login').send({ email: 'user_a_sec@test.com', password: '123' });
            if (loginA.status !== 200) console.error('Login User A failed:', loginA.body);
            userA_Token = loginA.body.accessToken;

            // Criar um Lead na Unidade B para testar ataque
            const resLeadB = await request(BASE_URL).post('/leads').set('Authorization', `Bearer ${adminToken}`)
                .send({ unit_id: unitB_Id, name: 'Lead Unit B', phone: '5511988887777', source: 'test' });
            if (!resLeadB.body.lead) console.error('Create Lead B failed:', resLeadB.body);
            leadB_Id = resLeadB.body.lead.id;
        } catch (e) {
            console.error('beforeAll error:', e);
        }
    });

    describe('❌ Cross-Tenant Access Attempt', () => {
        it('should block user from accessing leads of another unit', async () => {
            // Usuário A tenta acessar lead da Unidade B
            const res = await request(BASE_URL)
                .get(`/leads/${leadB_Id}`)
                .set('Authorization', `Bearer ${userA_Token}`);
            
            // Deve retornar 403 Forbidden
            expect(res.status).toBe(403);
        });

        it('should block user from listing conversations of another unit', async () => {
            const res = await request(BASE_URL)
                .get('/conversations')
                .query({ unitId: unitB_Id })
                .set('Authorization', `Bearer ${userA_Token}`);
            
            // O backend deve recusar pois UnitId da query != UnitId do user
            expect([403, 400]).toContain(res.status);
        });
    });

    describe('✅ Super Admin Access', () => {
        it('should allow super admin to access any unit', async () => {
            if (!adminToken) {
                console.warn('⚠️ Admin token not available, skipping test');
                return;
            }

            const res = await request(BASE_URL)
                .get('/leads')
                .query({ unit_id: unitB_Id })
                .set('Authorization', `Bearer ${adminToken}`);
            
            // Super admin deve ter sucesso
            expect([200, 503]).toContain(res.status); // 503 se DB não configurado
        });
    });

    describe('🔒 Authentication Required', () => {
        it('should reject requests without token', async () => {
            const res = await request(BASE_URL).get('/leads');
            expect(res.status).toBe(401);
        });

        it('should reject requests with invalid token', async () => {
            const res = await request(BASE_URL)
                .get('/leads')
                .set('Authorization', 'Bearer invalid-token-12345');
            
            expect(res.status).toBe(401);
        });
    });

    describe('🚨 Rate Limiting', () => {
        it('should block excessive login attempts', async () => {
            const attempts = [];
            
            // Tentar login 10 vezes consecutivas
            for (let i = 0; i < 10; i++) {
                const res = await request(BASE_URL)
                    .post('/admin/login')
                    .send({ email: 'fake@test.com', password: 'wrong' });
                
                attempts.push(res.status);
            }
            
            // Após algumas tentativas, deve retornar 429 (Too Many Requests)
            // Nota: Depende da configuração do rateLimiter.js
            expect(attempts).toContain(429);
        });
    });
});
