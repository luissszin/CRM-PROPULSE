import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// 1. Mock Dependencies (ESM)
jest.unstable_mockModule('../middleware/auth.js', () => ({
    requireAuth: (req, res, next) => {
        req.user = { id: 'u1', unitId: 'unit_123', role: 'admin' };
        next();
    },
    requireUnitContext: (req, res, next) => {
        req.unitId = 'unit_123'; 
        next();
    }
}));

const mockSupabaseChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis()
};

const mockSupabase = {
    from: jest.fn(() => mockSupabaseChain)
};

jest.unstable_mockModule('../services/supabaseService.js', () => ({ supabase: mockSupabase }));
jest.unstable_mockModule('../utils/logger.js', () => ({
    log: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

// Mock WhatsappService
const mockWhatsappService = {
    createInstance: jest.fn(),
    connect: jest.fn(),
    getStatus: jest.fn(),
    disconnect: jest.fn(),
    sendMessage: jest.fn()
};
jest.unstable_mockModule('../services/whatsapp/whatsapp.service.js', () => ({ whatsappService: mockWhatsappService }));

// 4. Import Routes DYNAMICALLY (after mocks)
const { default: whatsappRoutes } = await import('../routes/whatsappConnection.js');

const app = express();
app.use(express.json());
app.use('/units', whatsappRoutes);

describe('WhatsApp Integration Tests', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.from.mockClear();
        mockSupabaseChain.single.mockReset();
    });

    test('POST /connect - Should create instance and return QR', async () => {
        // Mock DB: No existing connection
        mockSupabaseChain.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
        // Insert return
        mockSupabaseChain.single.mockResolvedValueOnce({ 
            data: { id: 'conn_1', unit_id: 'unit_123', status: 'connecting', qr_code: 'base64qr' } 
        });

        // Mock Service
        mockWhatsappService.createInstance.mockResolvedValue({
            instanceId: 'test_inst',
            qrcode: 'base64qr',
            status: 'connecting'
        });

        const res = await request(app)
            .post('/units/unit_123/whatsapp/connect')
            .send({
                provider: 'evolution',
                credentials: { apiKey: '123' }
            });

        expect(res.status).toBe(201);
        expect(res.body.connection.qrCode).toBe('base64qr');
        expect(mockWhatsappService.createInstance).toHaveBeenCalled();
    });

    test('GET /status - Should return live status', async () => {
        // DB has connection
        mockSupabaseChain.single.mockResolvedValueOnce({ 
            data: { 
                id: 'conn_1', 
                unit_id: 'unit_123',
                status: 'connecting',
                provider: 'evolution',
                instance_id: 'inst_1',
                provider_config: {}
            } 
        });

        // Service returns connected
        mockWhatsappService.getStatus.mockResolvedValue({
            status: 'connected',
            phone: '551199999999'
        });

        const res = await request(app).get('/units/unit_123/whatsapp/status');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('connected');
        // Check update was called
        expect(mockSupabaseChain.update).toHaveBeenCalled();
    });

    test('DELETE /disconnect - Should remove connection', async () => {
         mockSupabaseChain.single.mockResolvedValueOnce({ 
            data: { id: 'conn_1', unit_id: 'unit_123', provider: 'evolution', instance_id: 'inst_1' } 
        });

        mockWhatsappService.disconnect.mockResolvedValue(true);

        const res = await request(app).delete('/units/unit_123/whatsapp/disconnect');
        
        expect(res.status).toBe(200);
    });

    test('Should reject access to wrong unit', async () => {
        // The mock middleware sets context to unit_123.
        const res = await request(app).get('/units/unit_999/whatsapp/status');
        expect(res.status).toBe(403);
    });

});
