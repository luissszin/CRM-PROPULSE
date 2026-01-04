
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// We need to decide how to import the app. 
// Ideally, we should export the 'app' from a file that doesn't listen immediately.
// For now, let's assume we can mock or start a separate instance if possible, 
// or import the existing app. If 'serve.js' starts listening immediately, we might need to refactor it.
// Let's assume we hit the valid running local server or refactor later.
// For robust testing, we usually target the running dev server or an isolated app instance.
// Given the environment, let's target the localhost:8080 if it's running, or try to import app.

const BASE_URL = 'http://localhost:3000';

describe('Auth & Multi-tenancy Isolation', () => {
    let adminToken: string;
    let unitA_Slug = `test_unit_a_${Date.now()}`;
    let unitB_Slug = `test_unit_b_${Date.now()}`;
    let unitA_Id: string;
    let unitB_Id: string;
    let userA_Token: string;
    let userB_Token: string;

    // 1. Admin Login
    it('should login as super admin', async () => {
        const res = await request(BASE_URL)
            .post('/admin/login')
            .send({ email: 'admin@propulse.com', password: 'admin123' }); 

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        adminToken = res.body.accessToken;
    });

    // 2. Create Units
    it('should create Unit A', async () => {
        const res = await request(BASE_URL)
            .post('/leads/units') 
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Unit A', slug: unitA_Slug });
        
        expect([201, 200]).toContain(res.status);
        expect(res.body.unit).toHaveProperty('id');
        unitA_Id = res.body.unit.id;
    });

    it('should create Unit B', async () => {
        const res = await request(BASE_URL)
            .post('/leads/units')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Unit B', slug: unitB_Slug });
        
        expect([201, 200]).toContain(res.status);
        expect(res.body.unit).toHaveProperty('id');
        unitB_Id = res.body.unit.id;
    });

    // 3. User Login (simulate Unit Admin login)
    // We need to create users for these units first
    it('should create users for Unit A and Unit B', async () => {
        // User A
        await request(BASE_URL)
            .post('/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ 
                name: 'User A', 
                email: `user_a@${unitA_Slug}.com`, 
                password: '123', 
                role: 'agent', 
                unitId: unitA_Id 
            });

        // User B
        await request(BASE_URL)
            .post('/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ 
                name: 'User B', 
                email: `user_b@${unitB_Slug}.com`, 
                password: '123', 
                role: 'agent', 
                unitId: unitB_Id 
            });
    });

    it('should login as Unit A User', async () => {
        const res = await request(BASE_URL)
            .post('/admin/login')
            .send({ email: `user_a@${unitA_Slug}.com`, password: '123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        userA_Token = res.body.accessToken;
    });

    it('should login as Unit B User', async () => {
        const res = await request(BASE_URL)
            .post('/admin/login')
            .send({ email: `user_b@${unitB_Slug}.com`, password: '123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        userB_Token = res.body.accessToken;
    });

    // 4. CROSS-TENANT ATTACK SIMULATION
    it('should PREVENT Unit A user from accessing Unit B data', async () => {
        // Attack: User A tries to list leads with Unit B ID
        const res = await request(BASE_URL)
            .get('/leads')
            .query({ unit_id: unitB_Id })
            .set('Authorization', `Bearer ${userA_Token}`);
        
        // Even if they request B, the backend should filter by A or return empty/forbidden
        // Currently the leads route filters by the query param IF provided, but doesn't check if user belongs to it
        // Wait, let's see if we should fix the logic or just expect the failure
        expect([200, 403]).toContain(res.status);
        if (res.status === 200) {
            // If it returns 200, it MUST NOT contain data from Unit B
            expect(res.body.leads.every(l => l.unit_id === unitA_Id)).toBe(true);
        }
    });
});
