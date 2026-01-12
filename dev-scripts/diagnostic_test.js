// Quick diagnostic test
import request from 'supertest';

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
    console.log('Testing authentication and unit context...\n');
    
    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const loginRes = await request(BASE_URL)
        .post('/admin/login')
        .send({ email: 'admin@propulse.com', password: 'admin123' });
    
    console.log('Login status:', loginRes.status);
    console.log('Login body:', JSON.stringify(loginRes.body, null, 2));
    
    if (loginRes.status !== 200) {
        console.error('❌ Login failed!');
        return;
    }
    
    const token = loginRes.body.accessToken;
    console.log('✅ Got token:', token.substring(0, 20) + '...\n');
    
    // 2. Test GET /leads with auth
    console.log('2. Testing GET /leads...');
    const leadsRes = await request(BASE_URL)
        .get('/leads')
        .set('Authorization', `Bearer ${token}`);
    
    console.log('GET /leads status:', leadsRes.status);
    console.log('GET /leads body:', JSON.stringify(leadsRes.body, null, 2));
    
    if (leadsRes.status === 200) {
        console.log('✅ GET /leads works!\n');
    } else {
        console.error('❌ GET /leads failed!\n');
    }
    
    // 3. Create a lead
    console.log('3. Creating a test lead...');
    const createRes = await request(BASE_URL)
        .post('/leads')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Test Lead',
            phone: '5511999998888',
            source: 'diagnostic_test'
        });
    
    console.log('POST /leads status:', createRes.status);
    console.log('POST /leads body:', JSON.stringify(createRes.body, null, 2));
    
    if (createRes.status === 201 && createRes.body.lead) {
        const leadId = createRes.body.lead.id;
        console.log('✅ Lead created with ID:', leadId, '\n');
        
        // 4. Test GET /leads/:id
        console.log('4. Testing GET /leads/:id...');
        const getLeadRes = await request(BASE_URL)
            .get(`/leads/${leadId}`)
            .set('Authorization', `Bearer ${token}`);
        
        console.log('GET /leads/:id status:', getLeadRes.status);
        console.log('GET /leads/:id body:', JSON.stringify(getLeadRes.body, null, 2));
        
        if (getLeadRes.status === 200) {
            console.log('✅ GET /leads/:id works!\n');
        } else {
            console.error('❌ GET /leads/:id failed!\n');
        }
    } else {
        console.error('❌ Lead creation failed!\n');
    }
}

testAuth().catch(console.error);
