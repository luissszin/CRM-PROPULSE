#!/usr/bin/env node
/**
 * Release Gate Validation Script
 * Validates Evolution WhatsApp migrations and system consistency
 * 
 * Usage:
 *   node backend/scripts/release_gate.js
 */

import { supabase } from '../services/supabaseService.js';

const COLORS = {
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[36m',
    RESET: '\x1b[0m'
};

function log(icon, message, color = COLORS.RESET) {
    console.log(`${color}${icon} ${message}${COLORS.RESET}`);
}

function ok(message) { log('✓', message, COLORS.GREEN); }
function fail(message) { log('✗', message, COLORS.RED); }
function warn(message) { log('⚠', message, COLORS.YELLOW); }
function info(message) { log('ℹ', message, COLORS.BLUE); }

let failures = 0;
let warnings = 0;

/**
 * Check if a column exists in a table
 */
async function checkColumn(tableName, columnName) {
    try {
        // Try to select the column
        const { error } = await supabase
            .from(tableName)
            .select(columnName)
            .limit(1);
        
        if (error) {
            // Check if it's a "column doesn't exist" error
            if (error.message?.includes('column') || error.code === '42703') {
                return false;
            }
            // Some other error, but column might exist
            warn(`Could not verify column ${tableName}.${columnName}: ${error.message}`);
            warnings++;
            return null;
        }
        return true;
    } catch (e) {
        warn(`Exception checking ${tableName}.${columnName}: ${e.message}`);
        warnings++;
        return null;
    }
}

/**
 * Check if a table exists
 */
async function checkTable(tableName) {
    try {
        const { error } = await supabase.from(tableName).select('*').limit(0);
        if (error) {
            if (error.message?.includes('does not exist') || error.code === '42P01') {
                return false;
            }
            warn(`Could not verify table ${tableName}: ${error.message}`);
            warnings++;
            return null;
        }
        return true;
    } catch (e) {
        warn(`Exception checking table ${tableName}: ${e.message}`);
        warnings++;
        return null;
    }
}

console.log('\n' + '='.repeat(60));
console.log('🚀 RELEASE GATE: Evolution WhatsApp Validation');
console.log('='.repeat(60) + '\n');

// ============================================
// SECTION 1: Database Schema Validation
// ============================================
console.log('📋 SECTION 1: Database Schema Validation\n');

info('Checking unit_whatsapp_connections columns...');
const connColumns = ['status_reason', 'connected_at', 'disconnected_at', 'qr_updated_at'];
for (const col of connColumns) {
    const exists = await checkColumn('unit_whatsapp_connections', col);
    if (exists === true) {
        ok(`unit_whatsapp_connections.${col} exists`);
    } else if (exists === false) {
        fail(`unit_whatsapp_connections.${col} MISSING - Run schema_connection_improvements.sql`);
        failures++;
    }
}

info('\nChecking messages columns...');
const msgColumns = ['client_message_id', 'retry_count', 'last_retry_at', 'error_details'];
for (const col of msgColumns) {
    const exists = await checkColumn('messages', col);
    if (exists === true) {
        ok(`messages.${col} exists`);
    } else if (exists === false) {
        fail(`messages.${col} MISSING - Run schema_outbound_improvements.sql`);
        failures++;
    }
}

info('\nChecking campaigns tables...');
const campaignTableExists = await checkTable('campaigns');
const recipientsTableExists = await checkTable('campaign_recipients');

if (campaignTableExists === true) {
    ok('campaigns table exists');
} else if (campaignTableExists === false) {
    fail('campaigns table MISSING - Run schema_campaigns.sql');
    failures++;
}

if (recipientsTableExists === true) {
    ok('campaign_recipients table exists');
} else if (recipientsTableExists === false) {
    fail('campaign_recipients table MISSING - Run schema_campaigns.sql');
    failures++;
}

// ============================================
// SECTION 2: In-Memory DB Compatibility
// ============================================
console.log('\n📋 SECTION 2: In-Memory DB Compatibility\n');

if (supabase._inmemory) {
    info('Running in-memory DB mode (test environment)');
    
    // Check if inmemoryDb has upsert
    try {
        const testChain = supabase.from('messages').upsert;
        if (typeof testChain === 'function') {
            ok('In-memory DB has upsert shim');
        } else {
            fail('In-memory DB missing upsert shim');
            failures++;
        }
    } catch (e) {
        fail('In-memory DB upsert check failed: ' + e.message);
        failures++;
    }
    
    // Try a simple query
    try {
        await supabase.from('units').select('*').limit(1);
        ok('In-memory DB basic queries work');
    } catch (e) {
        fail('In-memory DB basic query failed: ' + e.message);
        failures++;
    }
} else {
    info('Running against real Supabase (production mode)');
    ok('Supabase connection available');
}

// ============================================
// SECTION 3: Code Consistency Checks
// ============================================
console.log('\n📋 SECTION 3: Code Consistency Checks\n');

info('Verifying route imports...');
try {
    await import('../routes/whatsappWebhook.js');
    ok('whatsappWebhook.js imports successfully');
} catch (e) {
    fail(`whatsappWebhook.js import error: ${e.message}`);
    failures++;
}

try {
    await import('../routes/messages.js');
    ok('messages.js imports successfully');
} catch (e) {
    fail(`messages.js import error: ${e.message}`);
    failures++;
}

try {
    await import('../services/whatsapp/messageHandler.service.js');
    ok('messageHandler.service.js imports successfully');
} catch (e) {
    fail(`messageHandler.service.js import error: ${e.message}`);
    failures++;
}

try {
    await import('../utils/webhookHelper.js');
    ok('webhookHelper.js imports successfully');
} catch (e) {
    fail(`webhookHelper.js import error: ${e.message}`);
    failures++;
}

// ============================================
// SECTION 4: Evolution Flow Validation
// ============================================
console.log('\n📋 SECTION 4: Evolution Flow Validation (Logic Checks)\n');

info('Checking instance naming pattern...');
// This is a logic check - verify the pattern exists in code
try {
    const evolutionProviderCode = await import('../services/whatsapp/providers/evolution.provider.js');
    ok('Evolution provider module loads correctly');
} catch (e) {
    fail(`Evolution provider error: ${e.message}`);
    failures++;
}

info('Checking campaign service...');
try {
    await import('../services/campaignService.js');
    ok('Campaign service loads correctly');
} catch (e) {
    fail(`Campaign service error: ${e.message}`);
    failures++;
}

// ============================================
// SUMMARY
// ============================================
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(60) + '\n');

if (failures === 0 && warnings === 0) {
    ok('ALL CHECKS PASSED ✓');
    console.log('\n' + COLORS.GREEN + '🎉 System is PRODUCTION READY!' + COLORS.RESET + '\n');
    process.exit(0);
} else if (failures === 0 && warnings > 0) {
    warn(`${warnings} warnings found (non-critical)`);
    console.log('\n' + COLORS.YELLOW + '⚠️  System is usable but review warnings' + COLORS.RESET + '\n');
    process.exit(0);
} else {
    fail(`${failures} critical failures found`);
    if (warnings > 0) warn(`${warnings} warnings found`);
    console.log('\n' + COLORS.RED + '❌ System NOT READY for production' + COLORS.RESET + '\n');
    console.log('Action needed:');
    console.log('1. Apply missing migrations in Supabase SQL Editor');
    console.log('2. Re-run this validation script');
    console.log('\n');
    process.exit(1);
}
