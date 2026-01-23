import http from 'http';

const unitId = 'ea423f36-df22-4581-be87-3fcc99ecb724'; // ID que vimos nos seus logs
const loginData = JSON.stringify({
    email: 'admin@propulse.com',
    password: 'admin123'
});

async function runTest() {
    console.log('🚀 Iniciando Teste de Conexão WhatsApp...\n');

    // 1. Login para pegar o Token
    console.log('Step 1: Autenticando...');
    const token = await new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': loginData.length
            }
        }, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const parsed = JSON.parse(data);
                    console.log('✅ Login Bem-sucedido!');
                    resolve(parsed.accessToken);
                } else {
                    reject(new Error(`Falha no login: ${res.statusCode} - ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(loginData);
        req.end();
    });

    // 2. Tentar conectar o WhatsApp
    console.log('\nStep 2: Chamando endpoint de conexão...');
    const connectPayload = JSON.stringify({
        provider: 'evolution',
        credentials: {
            apiKey: 'MINHA_API_KEY',
            instanceId: 'unit_ea423f36'
        }
    });

    const result = await new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: `/units/${unitId}/whatsapp/connect`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': connectPayload.length
            }
        }, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                console.log(`📡 Status da Resposta: ${res.statusCode}`);
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        req.write(connectPayload);
        req.end();
    });

    console.log('\n--- RESULTADO FINAL ---');
    console.log(JSON.stringify(result, null, 2));

    if (result.success && result.connection) {
        if (result.connection.qrCode) {
            console.log('\n✨ SUCESSO! O QR Code foi gerado corretamente.');
            console.log('Base64 do QR Code inicia com:', result.connection.qrCode.substring(0, 50) + '...');
        } else if (result.connection.status === 'connected') {
            console.log('\n✅ JÁ CONECTADO! O WhatsApp está online.');
        } else {
            console.log('\n⚠️  Resposta sem QR Code. Verificando logs do servidor...');
        }
    } else {
        console.log('\n❌ FALHA no teste. Verifique as mensagens acima.');
    }
}

runTest().catch(console.error);
