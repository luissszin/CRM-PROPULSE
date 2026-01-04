import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testUnitFields() {
    try {
        console.log('1. Login...');
        const loginRes = await fetch(`${BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@propulse.com', password: 'admin123' })
        });

        if (!loginRes.ok) {
            console.error('Login Failed:', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.accessToken;
        console.log('Login Success. Token:', token ? 'OK' : 'MISSING');

        console.log('2. Get Units...');
        const unitsRes = await fetch(`${BASE_URL}/admin/units`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const units = await unitsRes.json();

        if (!units || units.length === 0) {
            console.error('No units found to test.');
            return;
        }

        const unit = units[0];
        console.log(`Testing with Unit: ${unit.name} (${unit.id})`);

        console.log('3. Update Custom Fields...');
        const newFields = [
            { id: 'f1', name: 'Test Field API', type: 'text', required: true, order: 0 },
            { id: 'f2', name: 'Test Number API', type: 'number', required: false, order: 1 }
        ];

        // We need to update the WHOLE metadata or just the fields?
        // The PUT /admin/units/:id route implementation needs to be checked.
        // Based on previous tool output for persistence, it seemed to handle top-level props AND metadata merging?
        // I'll assume we send the object as the frontend does. 
        // Frontend sends: api.updateUnit(unitId, { customFields: updatedFields })

        const updateRes = await fetch(`${BASE_URL}/admin/units/${unit.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ customFields: newFields })
        });

        if (!updateRes.ok) {
            console.error('Update Failed:', await updateRes.text());
            return;
        }
        console.log('Update Success.');

        console.log('4. Verify Persistence...');
        const verifyRes = await fetch(`${BASE_URL}/admin/units/${unit.id}`, { // Assuming individual GET exists or re-list
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // If GET /:id doesn't exist, use list
        let verifiedUnit;
        if (verifyRes.ok) {
            verifiedUnit = await verifyRes.json();
        } else {
            const listRes = await fetch(`${BASE_URL}/admin/units`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const list = await listRes.json();
            verifiedUnit = list.find(u => u.id === unit.id);
        }

        console.log('Verified Unit Custom Fields:', JSON.stringify(verifiedUnit.customFields, null, 2));

        if (verifiedUnit.customFields && verifiedUnit.customFields.length === 2 && verifiedUnit.customFields[0].name === 'Test Field API') {
            console.log('SUCCESS: Custom Fields Persisted!');
        } else {
            console.error('FAILURE: Custom Fields NOT Persisted correctly.');
        }

    } catch (e) {
        console.error('Test Error:', e);
    }
}

testUnitFields();
