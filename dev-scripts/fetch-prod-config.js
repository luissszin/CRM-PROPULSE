import axios from 'axios';

async function fetchUnitConfig() {
  const url = 'https://crm-propulse-prod-production.up.railway.app';
  const loginUrl = `${url}/admin/login`;
  
  try {
    console.log('Logging in...');
    const loginRes = await axios.post(loginUrl, {
      email: 'admin@propulse.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.accessToken;
    console.log('Login successful.');
    
    console.log('Fetching units...');
    const unitsRes = await axios.get(`${url}/admin/units`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (unitsRes.data.length === 0) {
       console.log('No units found.');
       return;
    }
    
    const unitId = unitsRes.data[0].id;
    console.log(`Fetching WhatsApp status for unit: ${unitId}`);
    
    const statusRes = await axios.get(`${url}/units/${unitId}/whatsapp/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('WhatsApp Status:', JSON.stringify(statusRes.data, null, 2));
    
    // Check if we can get the Evolution URL from some metadata or by trying to connect
    // Actually, let's try to get the unit details
    const unitDetailRes = await axios.get(`${url}/admin/units`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Unit Details:', JSON.stringify(unitDetailRes.data[0], null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

fetchUnitConfig();
