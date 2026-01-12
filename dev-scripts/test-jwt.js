// Test JWT Login
const testLogin = async () => {
    try {
        console.log('Testing admin login...');
        const response = await fetch('http://localhost:3000/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@propulse.com',
                password: 'admin123',
            }),
        });

        if (!response.ok) {
            console.error('Login failed:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response:', text);
            return;
        }

        const data = await response.json();
        console.log('\n✅ Login successful!');
        console.log('\nResponse data:');
        console.log(JSON.stringify(data, null, 2));

        // Check if tokens are present
        if (data.accessToken && data.refreshToken) {
            console.log('\n✅ Access token present:', data.accessToken.substring(0, 50) + '...');
            console.log('✅ Refresh token present:', data.refreshToken.substring(0, 50) + '...');

            // Test using the access token
            console.log('\n\nTesting API call with access token...');
            const apiResponse = await fetch('http://localhost:3000/admin/users', {
                headers: { 'Authorization': `Bearer ${data.accessToken}` },
            });

            if (apiResponse.ok) {
                console.log('✅ API call with token successful!');
            } else {
                console.log('❌ API call with token failed:', apiResponse.status);
            }
        } else {
            console.log('\n❌ Tokens missing in response!');
        }
    } catch (error) {
        console.error('❌ Error during test:', error);
    }
};

testLogin();
