import axios from 'axios';

async function debug401() {
  const crmUrl = 'https://crm-propulse-prod-production.up.railway.app';
  
  try {
    console.log('1. Testing Login...');
    const loginRes = await axios.post(`${crmUrl}/admin/login`, {
      email: 'admin@propulse.com',
      password: 'admin123'
    });
    
    console.log('Login Status:', loginRes.status);
    const token = loginRes.data.accessToken;
    console.log('Token Received:', token ? 'YES (first 20 chars: ' + token.substring(0, 20) + '...)' : 'NO');
    
    if (!token) return;

    console.log('\n2. Testing /admin/units with Token...');
    try {
      const unitsRes = await axios.get(`${crmUrl}/admin/units`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Units Status:', unitsRes.status);
      console.log('Units Count:', unitsRes.data.length);
      
      const unitId = unitsRes.data[0]?.id;
      if (unitId) {
          console.log('\n3. Testing /units/:id/whatsapp/status with Token...');
          try {
            const statusRes = await axios.get(`${crmUrl}/units/${unitId}/whatsapp/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('WhatsApp Status Code:', statusRes.status);
            console.log('WhatsApp Status Body:', statusRes.data);
          } catch (e) {
            console.log('WhatsApp Status Error:', e.response?.status);
            console.log('ErrorData:', JSON.stringify(e.response?.data).substring(0, 200));
          }
      }

    } catch (e) {
      console.log('Units Error:', e.response?.status, e.response?.data || e.message);
    }

  } catch (error) {
    console.error('Initial Login Error:', error.response?.status, error.response?.data || error.message);
  }
}

debug401();
