// Standalone Verification Script (No Jest)
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock Environment
process.env.JWT_ACCESS_SECRET = 'test_secret';

// Mock Deps before import using a trick or just defining them if possible.
// Since modules are ESM, we can't easily mock imports without a loader.
// BUT we can use a simpler approach: 
// 1. Manually check the logic by creating a small "Unit Test" that imports the functions directly
//    and passes mock req/res objects.

import { requireUnitContext } from '../backend/middleware/auth.js';

async function runTests() {
    console.log('🔒 Starting Manual Security Validation...');
    let failures = 0;

    // SCENARIO 1: Normal User Isolation
    {
        const req = {
            user: { id: 'u1', role: 'agent', unitId: 'unit_A' },
            query: { unitId: 'unit_B' },
            body: {},
            params: {}
        };
        const res = { status: () => res, json: () => {} };
        const next = () => {};

        requireUnitContext(req, res, next);

        if (req.unitId !== 'unit_A') {
            console.error('❌ FAIL: Normal user was NOT isolated to unit_A');
            failures++;
        } else {
            console.log('✅ PASS: Normal user isolated');
        }
    }

    // SCENARIO 2: Super Admin Switch
    {
        const req = {
            user: { id: 'admin', role: 'super_admin', unitId: null },
            query: { unitId: 'unit_B' },
            body: {},
            params: {}
        };
        const res = { status: () => res, json: () => {} };
        const next = () => {};

        requireUnitContext(req, res, next);

        if (req.unitId !== 'unit_B') {
            console.error('❌ FAIL: Super Admin could NOT switch to unit_B. Got:', req.unitId);
            failures++;
        } else {
            console.log('✅ PASS: Super Admin switched units');
        }
    }
    
    // SCENARIO 3: Super Admin Fallback
    {
        const req = {
            user: { id: 'admin', role: 'super_admin', unitId: 'unit_Default' },
            query: {},
            body: {},
            params: {}
        };
        const res = { status: () => res, json: () => {} };
        const next = () => {};

        requireUnitContext(req, res, next);

        if (req.unitId !== 'unit_Default') {
            console.error('❌ FAIL: Super Admin fallback failed');
            failures++;
        } else {
            console.log('✅ PASS: Super Admin fallback worked');
        }
    }

    if (failures === 0) {
        console.log('🎉 All Security Logic Verified!');
        process.exit(0);
    } else {
        console.error(`${failures} tests failed.`);
        process.exit(1);
    }
}

runTests();
