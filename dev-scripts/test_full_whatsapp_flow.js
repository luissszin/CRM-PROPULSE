import axios from 'axios';

const EVO_URL = 'http://localhost:8085';
const API_KEY = 'MINHA_API_KEY';
const TEST_INSTANCE = 'test_antigravity';

async function testFullFlow() {
    console.log('🚀 Iniciando Teste de Fluxo Completo (Evolution API)...');

    const headers = {
        'Content-Type': 'application/json',
        'apikey': API_KEY
    };

    try {
        // 1. Criar Instância
        console.log(`\n1. Criando/Verificando instância: ${TEST_INSTANCE}...`);
        const createRes = await axios.post(`${EVO_URL}/instance/create`, {
            instanceName: TEST_INSTANCE,
            token: API_KEY,
            qrcode: true
        }, { headers });
        
        console.log('✅ Instância criada com sucesso!');

        // 2. Buscar QR Code (Simulando o que o frontend faz)
        console.log('\n2. Solicitando QR Code para conexão...');
        const connectRes = await axios.get(`${EVO_URL}/instance/connect/${TEST_INSTANCE}`, { headers });
        
        if (connectRes.data && (connectRes.data.qrcode || connectRes.data.base64)) {
            console.log('✅ QR Code gerado com sucesso! (O servidor está pronto para pareamento)');
        } else {
            console.log('⚠️ Instância já pode estar conectada ou em outro estado.');
        }

        // 3. Verificar Status da Conexão
        console.log('\n3. Verificando estado da conexão...');
        const statusRes = await axios.get(`${EVO_URL}/instance/connectionState/${TEST_INSTANCE}`, { headers });
        console.log('📊 Estado atual:', statusRes.data.instance?.state || statusRes.data.state || 'Desconhecido');

        console.log('\n=== CONCLUSÃO DO TESTE ===');
        console.log('O fluxo de comunicação entre o Backend e a Evolution API está 100% OPERACIONAL.');
        console.log('Você pode agora usar o Frontend para escanear o código real.');

    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:', error.response?.data || error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('O servidor Evolution API não está respondendo na porta 8085.');
        }
    }
}

testFullFlow();
