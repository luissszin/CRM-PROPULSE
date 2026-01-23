import http from 'http';

const instanceName = 'test_debug_' + Date.now();

console.log('🧪 Testando Evolution API diretamente...\n');
console.log(`Criando instância: ${instanceName}`);

const data = JSON.stringify({
    instanceName: instanceName,
    token: 'test_token_123',
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS'
});

const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/instance/create',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': 'MINHA_API_KEY',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
        responseData += chunk;
    });
    
    res.on('end', () => {
        console.log(`\nStatus: ${res.statusCode}`);
        console.log('\n--- RESPOSTA COMPLETA ---');
        
        try {
            const parsed = JSON.parse(responseData);
            console.log(JSON.stringify(parsed, null, 2));
            
            console.log('\n--- ANÁLISE ---');
            console.log('Tem QR Code?', !!(parsed.qrcode || parsed.qrcode?.base64 || parsed.base64));
            
            if (parsed.qrcode?.base64) {
                console.log('✅ QR Code encontrado em: qrcode.base64');
                console.log('Primeiros 50 caracteres:', parsed.qrcode.base64.substring(0, 50));
            } else if (parsed.qrcode) {
                console.log('✅ QR Code encontrado em: qrcode');
                console.log('Primeiros 50 caracteres:', parsed.qrcode.substring(0, 50));
            } else if (parsed.base64) {
                console.log('✅ QR Code encontrado em: base64');
                console.log('Primeiros 50 caracteres:', parsed.base64.substring(0, 50));
            } else {
                console.log('❌ QR Code NÃO encontrado na resposta!');
                console.log('Possíveis locais verificados: qrcode.base64, qrcode, base64');
            }
            
            console.log('\nStatus da instância:', parsed.instance?.status || parsed.status || 'N/A');
            
        } catch (e) {
            console.log('Resposta (texto):', responseData);
            console.error('Erro ao parsear JSON:', e.message);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Erro na requisição:', e.message);
    if (e.code === 'ECONNREFUSED') {
        console.error('\n⚠️  Evolution API não está respondendo na porta 8080!');
        console.error('Execute: docker-compose up -d');
    }
});

req.write(data);
req.end();
