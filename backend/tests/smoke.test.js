import { test, describe } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../serve.js';

describe('🔥 Smoke Test', () => {

  test('Server should start and respond to healthcheck', async () => {
    const res = await request(app).get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  test('Auth middleware should reject invalid token', async () => {
      const res = await request(app)
          .get('/leads')
          .set('Authorization', 'Bearer invalid-token-123');
      
      assert.strictEqual(res.status, 401);
  });
});
