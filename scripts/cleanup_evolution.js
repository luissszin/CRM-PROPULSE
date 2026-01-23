import http from 'http';

const apiKey = 'MINHA_API_KEY';

async function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(responseData) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function cleanup() {
    console.log('🧹 Cleaning up instances...');
    const instances = await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: '/instance/fetchInstances',
        method: 'GET',
        headers: { 'apikey': apiKey }
    });

    if (instances.status === 200 && Array.isArray(instances.data)) {
        for (const inst of instances.data) {
            const name = inst.instanceName || inst.name;
            console.log(`Deleting ${name}...`);
            await makeRequest({
                hostname: 'localhost',
                port: 8080,
                path: `/instance/delete/${name}`,
                method: 'DELETE',
                headers: { 'apikey': apiKey }
            });
        }
    }
    console.log('Done.');
}

cleanup().catch(console.error);
