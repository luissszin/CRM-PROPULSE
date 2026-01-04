import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testZapiPersistence() {
    try {
        console.log('1. Login...');
        const loginRes = await fetch(`${BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@propulse.com', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.accessToken;

        console.log('2. Get Units...');
        const unitsRes = await fetch(`${BASE_URL}/admin/units`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const units = await unitsRes.json();
        const unit = units[0];
        console.log(`Using Unit: ${unit.name} (${unit.id})`);

        console.log('3. Create Z-API Instance...');
        const instancePayload = {
            unitId: unit.id,
            instanceName: 'Z-API API Test',
            provider: 'zapi',
            config: {
                instanceId: '3B2D-TEST-API',
                token: 'TEST-TOKEN-API',
                clientToken: 'CLIENT-TOKEN-API'
            }
        };

        const createRes = await fetch(`${BASE_URL}/whatsapp/instances`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(instancePayload)
        });

        if (!createRes.ok) {
            console.error('Create Failed:', await createRes.text());
            return;
        }
        const createdInstance = await createRes.json();
        console.log('Create Success. ID:', createdInstance.id);

        console.log('4. Verify Persistence (GET instances)...');
        const listRes = await fetch(`${BASE_URL}/whatsapp/instances?unitId=${unit.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const instances = await listRes.json();
        const found = instances.find(i => i.id === createdInstance.id);

        console.log('Found Instance:', JSON.stringify(found, null, 2));

        if (found && found.provider === 'zapi' && found.provider_config && found.provider_config.instanceId === '3B2D-TEST-API') {
            console.log('SUCCESS: Z-API Instance Persisted Correctly!');
        } else {
            console.error('FAILURE: Z-API Instance data mismatch or not found.');
        }

    } catch (e) {
        console.error('Test Error:', e);
    }
}

testZapiPersistence();
