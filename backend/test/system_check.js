
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@propulse.com';
const ADMIN_PASSWORD = 'admin123';

async function runTest() {
    console.log('🚀 Starting System Check...');
    let token = null;

    try {
        // 1. Health Check
        console.log('\n[1] Testing Health Check...');
        const health = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health Check Passed:', health.data);

        // 2. Login
        console.log('\n[2] Testing Admin Login...');
        try {
            const login = await axios.post(`${BASE_URL}/admin/login`, {
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            });
            console.log('✅ Login Passed. Token received.');
            token = login.data.accessToken;
        } catch (e) {
            console.log('⚠️ Login Failed (might not be required for all endpoints):', e.response?.data || e.message);
        }

        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        // 3. Contacts
        console.log('\n[3] Testing Contacts API...');
        const testPhone = '551199999' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        console.log(`Creating contact with phone: ${testPhone}`);

        // Create
        const createContact = await axios.post(`${BASE_URL}/contacts`, {
            phone: testPhone,
            name: 'System Check Contact'
        }, { headers: authHeaders });
        console.log('✅ Create Contact Passed:', createContact.data);

        // List
        const listContacts = await axios.get(`${BASE_URL}/contacts?q=${testPhone}`, { headers: authHeaders });
        const found = listContacts.data.contacts.find(c => c.phone.includes(testPhone));
        if (found) {
            console.log('✅ List Contacts Passed: Found created contact.');
        } else {
            console.error('❌ List Contacts Failed: Created contact not found.');
        }

        // 4. Admin Data (Users/Units)
        console.log('\n[4] Testing Admin Data...');
        const users = await axios.get(`${BASE_URL}/admin/users`, { headers: authHeaders });
        console.log(`✅ Fetch Users Passed: ${users.data.length} users found.`);

        const units = await axios.get(`${BASE_URL}/admin/units`, { headers: authHeaders });
        console.log(`✅ Fetch Units Passed: ${units.data.length} units found.`);

        console.log('\n🎉 System Check Complete!');

    } catch (err) {
        console.error('\n❌ System Check Failed:', err.message);
        if (err.response) {
            console.error('Response Status:', err.response.status);
            console.error('Response Data:', err.response.data);
        }
    }
}

runTest();
