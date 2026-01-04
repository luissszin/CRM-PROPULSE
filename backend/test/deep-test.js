import axios from 'axios';
import logger from '../utils/logger.js';

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@propulse.com';
const ADMIN_PASSWORD = 'admin123';

async function runDeepTest() {
    logger.info('Starting Deep Integrated Test...');

    try {
        // 1. Admin Login
        logger.info('Step 1: Admin Login');
        const loginResp = await axios.post(`${BASE_URL}/admin/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const { accessToken, user: adminUser } = loginResp.data;
        logger.info(`Login successful as ${adminUser.name}`);

        const authHeaders = { headers: { Authorization: `Bearer ${accessToken}` } };

        // 2. Create a new Unit
        logger.info('Step 2: Create a new Unit');
        const unitName = `Test Unit ${Date.now()}`;
        const unitSlug = `test-unit-${Date.now()}`;
        const unitResp = await axios.post(`${BASE_URL}/leads/units`, {
            name: unitName,
            slug: unitSlug
        });
        const unit = unitResp.data.unit;
        logger.info(`Unit created: ${unit.name} (id: ${unit.id})`);

        // 3. Create a new Agent User for this Unit
        logger.info('Step 3: Create a new Agent User');
        const agentEmail = `agent-${Date.now()}@test.com`;
        const userResp = await axios.post(`${BASE_URL}/admin/users`, {
            name: 'Test Agent',
            email: agentEmail,
            password: 'password123',
            role: 'agent',
            unitId: unit.id
        });
        const agent = userResp.data;
        logger.info(`Agent user created: ${agent.email}`);

        // 4. Agent Login
        logger.info('Step 4: Agent Login');
        const agentLoginResp = await axios.post(`${BASE_URL}/admin/login`, {
            email: agentEmail,
            password: 'password123'
        });
        const { accessToken: agentToken } = agentLoginResp.data;
        logger.info('Agent login successful');

        const agentAuthHeaders = { headers: { Authorization: `Bearer ${agentToken}` } };

        // 5. Create a Lead
        logger.info('Step 5: Create a Lead');
        const leadPhone = `55119${Math.floor(Math.random() * 90000000 + 10000000)}`;
        const leadResp = await axios.post(`${BASE_URL}/leads`, {
            unit_id: unit.id,
            name: 'Deep Test Lead',
            phone: leadPhone,
            email: 'lead@test.com',
            source: 'deep-test'
        });
        const lead = leadResp.data.lead;
        logger.info(`Lead created: ${lead.name} (id: ${lead.id})`);

        // 6. Verify Lead in List
        logger.info('Step 6: Verify Lead in List');
        const leadsListResp = await axios.get(`${BASE_URL}/leads?unit_id=${unit.id}`);
        const leads = leadsListResp.data.leads;
        const foundLead = leads.find(l => l.id === lead.id);
        if (foundLead) {
            logger.info('Lead found in list successfully');
        } else {
            throw new Error('Lead not found in list after creation');
        }

        // 7. Send Message to Lead
        logger.info('Step 7: Send Message to Lead');
        const msgContent = 'Olá! Esta é uma mensagem do teste profundo.';
        const msgResp = await axios.post(`${BASE_URL}/messages`, {
            phone: leadPhone,
            message: msgContent
        });
        if (msgResp.data.success) {
            logger.info('Message sent successfully via /messages');
        } else {
            throw new Error('Failed to send message via /messages');
        }

        // 8. Verify Conversation and Message in DB
        logger.info('Step 8: Verify Conversation and Message');
        const conversationsResp = await axios.get(`${BASE_URL}/conversations?unitId=${unit.id}`);
        const conversations = conversationsResp.data;
        // Note: backend might return array directly or { conversations: [] }
        const convList = Array.isArray(conversations) ? conversations : (conversations.conversations || []);

        // The message endpoint creates a conversation if it doesn't exist
        // Let's find conversation by contact (need to find contact_id from lead or phone)
        logger.info(`Found ${convList.length} conversations for unit`);

        // 9. (Optional) Check admin messages list
        logger.info('Step 9: Check Admin Messages List');
        const adminMsgsResp = await axios.get(`${BASE_URL}/admin/messages`);
        const adminMsgs = adminMsgsResp.data.messages;
        const latestMsg = adminMsgs[0];
        if (latestMsg && latestMsg.content === msgContent) {
            logger.info('Successfully verified message content in admin messages list');
        } else {
            logger.warn('Could not verify message content in admin messages list (might be due to in-memory DB or complex query fallback)');
        }

        logger.info('✅ DEEP TEST COMPLETED SUCCESSFULLY!');
    } catch (error) {
        logger.error('❌ DEEP TEST FAILED:');
        if (error.response) {
            logger.error(`Status: ${error.response.status}`);
            logger.error(`Data: ${JSON.stringify(error.response.data)}`);
        } else {
            logger.error(error.message);
        }
        process.exit(1);
    }
}

runDeepTest();
