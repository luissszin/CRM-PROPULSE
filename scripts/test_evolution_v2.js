import http from 'http';

const instanceName = 'v2_test_' + Date.now();
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

async function run() {
    console.log('🚀 Testando Evolution API v2 Flow...');
    
    // 1. Create Instance
    console.log(`\n1. Criando instância: ${instanceName}`);
    const createData = JSON.stringify({
        instanceName: instanceName,
        token: 'test_token',
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
    });
    
    const create = await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: '/instance/create',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
            'Content-Length': createData.length
        }
    }, createData);
    
    console.log('Status:', create.status);
    console.log('Resposta:', JSON.stringify(create.data, null, 2));

    if (create.status !== 201) {
        console.error('❌ Erro ao criar instância');
        return;
    }

    // 2. Wait for Baileys
    console.log('\n2. Aguardando 10 segundos para Baileys inicializar...');
    await new Promise(r => setTimeout(r, 10000));

    // 3. Try to Connect / Get QR
    console.log('\n3. Tentando obter QR Code...');
    for (let i = 1; i <= 20; i++) {
        console.log(`Tentativa ${i}...`);
        const connect = await makeRequest({
            hostname: 'localhost',
            port: 8080,
            path: `/instance/connect/${instanceName}`,
            method: 'GET',
            headers: { 'apikey': apiKey }
        });
        
        console.log('Status:', connect.status);
        const qData = connect.data.qrcode;
        const q = (typeof qData === 'string' ? qData : qData?.base64) || connect.data.base64;
        
        if (q) {
            console.log('✅ QR CODE ENCONTRADO!');
            console.log('Base64:', q.substring(0, 50) + '...');
            return;
        } else {
            console.log('❌ Nenhum QR Code ainda (count:0)');
        }
        await new Promise(r => setTimeout(r, 3000));
    }
    
    console.error('\n❌ Falha ao obter QR Code após 20 tentativas.');

    // 4. Try Pairing Code as fallback to check if Baileys is alive
    console.log('\n4. Tentando Pairing Code (apenas para diagnóstico)...');
    const pairing = await makeRequest({
        hostname: 'localhost',
        port: 8080,
        path: `/instance/connect/pairingCode/${instanceName}?number=5511999999999`,
        method: 'GET',
        headers: { 'apikey': apiKey }
    });
    console.log('Status Piring Code:', pairing.status);
    console.log('Resposta Pairing Code:', JSON.stringify(pairing.data, null, 2));
}

run().catch(console.error);
