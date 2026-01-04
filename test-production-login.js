import axios from 'axios';

async function testLogin() {
  const url = 'https://crm-propulse-prod-production.up.railway.app/admin/login';
  try {
    console.log('Testing login to:', url);
    const response = await axios.post(url, {
      email: 'admin@propulse.com',
      password: 'admin123'
    });
    console.log('Response status:', response.status);
    console.log('Keys in response:', Object.keys(response.data));
    console.log('Value of accessToken:', response.data.accessToken ? 'Present' : 'Missing');
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
}

testLogin();
