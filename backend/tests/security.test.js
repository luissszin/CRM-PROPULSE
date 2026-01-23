import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

process.env.JWT_ACCESS_SECRET = 'test_secret_key_123';
const SECRET = process.env.JWT_ACCESS_SECRET;

// 1. Mock Dependencies (ESM)
// We need a stable mock object to reference in tests
const mockSupabaseChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis()
};

const mockSupabaseClient = {
    from: jest.fn(() => mockSupabaseChain)
};

jest.unstable_mockModule('../services/supabaseService.js', () => ({
  supabase: mockSupabaseClient
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
    log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        security: { authFailed: jest.fn(), authSuccess: jest.fn(), crossTenantAttempt: jest.fn() },
        whatsapp: { webhookReceived: jest.fn(), messageSent: jest.fn(), connectionError: jest.fn() }
    }
}));

jest.unstable_mockModule('../middleware/rateLimiter.js', () => ({
    apiLimiter: (req, res, next) => next(),
    webhookLimiter: (req, res, next) => next()
}));

// 2. Import Modules (Dynamic)
const { requireAuth, requireUnitContext } = await import('../middleware/auth.js');

describe('Security & Isolation Tests', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabaseClient.from.mockClear();
        mockSupabaseChain.single.mockReset();
        
        app = express();
        app.use(express.json());

        // Setup Test Routes
        app.get('/protected', requireAuth, requireUnitContext, (req, res) => {
            res.json({ unitId: req.unitId });
        });
        
        app.get('/data', requireAuth, requireUnitContext, (req, res) => {
            res.json({ accessedUnit: req.unitId });
        });
    });

    const generateToken = (payload) => jwt.sign(payload, SECRET);

    test('1. Should reject request without token (401)', async () => {
        const res = await request(app).get('/protected');
        expect(res.status).toBe(401);
    });

    test('2. Should reject invalid token (401)', async () => {
        const res = await request(app).get('/protected').set('Authorization', 'Bearer invalid');
        expect(res.status).toBe(401);
    });

    test('3. Should allow valid token and inject unitId', async () => {
        const token = generateToken({ id: 'u1', role: 'agent' });
        
        // Mock DB Success
        mockSupabaseChain.single.mockResolvedValue({ 
            data: { id: 'u1', unit_id: 'unit_A', role: 'agent' }, error: null 
        });

        const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
        
        if (res.status !== 200) console.error('Test 3 Failed Body:', res.body);
        expect(res.status).toBe(200);
        expect(res.body.unitId).toBe('unit_A');
    });

    test('4. Should REJECT request if query param requests another unit (Isolation)', async () => {
        const token = generateToken({ id: 'u1', role: 'agent' });
        
        // Mock DB Success
        mockSupabaseChain.single.mockResolvedValue({ 
            data: { id: 'u1', unit_id: 'unit_A', role: 'agent' }, error: null 
        });

        // Attacker tries to access unit_B
        const res = await request(app)
            .get('/data?unitId=unit_B')
            .set('Authorization', `Bearer ${token}`);
        
        // With new security policy, this should be forbidden
        expect(res.status).toBe(403);
    });

    test('5. Super Admin SHOULD be able to switch units', async () => {
        const token = generateToken({ id: 'admin1', role: 'super_admin' });
        
        // Mock DB Success
        mockSupabaseChain.single.mockResolvedValue({ 
            data: { id: 'admin1', unit_id: null, role: 'super_admin' }, error: null 
        });

        const res = await request(app)
            .get('/data?unitId=unit_B')
            .set('Authorization', `Bearer ${token}`);
        
        if (res.status !== 200) console.log('Test 5 Failed Status:', res.status, res.body);
        expect(res.status).toBe(200);
        if (res.body.accessedUnit !== 'unit_B') console.log('Test 5 Failed Logic: Expected unit_B, got', res.body.accessedUnit);
        expect(res.body.accessedUnit).toBe('unit_B'); // Allowed
    });
});
