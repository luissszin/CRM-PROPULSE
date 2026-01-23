// Script para decodificar e verificar o JWT do usuário atual

console.log('🔍 Diagnóstico de JWT - Acesse o frontend e cole o token\n');
console.log('📋 Instruções:');
console.log('1. Abra DevTools (F12)');
console.log('2. Vá em: Application → Local Storage → http://localhost:5173');
console.log('3. Procure por "propulse-crm-storage"');
console.log('4. Copie o valor de "accessToken"');
console.log('5. Cole abaixo quando solicitado\n');

import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Cole o token JWT aqui: ', (token) => {
    if (!token || token.trim() === '') {
        console.error('❌ Token vazio!');
        rl.close();
        return;
    }

    try {
        // Decodificar o payload (parte 2 do JWT)
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error('❌ Token inválido - formato incorreto');
            rl.close();
            return;
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        
        console.log('\n--- PAYLOAD DECODIFICADO ---');
        console.log(JSON.stringify(payload, null, 2));
        
        console.log('\n--- ANÁLISE ---');
        console.log(`👤 User ID: ${payload.id || 'N/A'}`);
        console.log(`📧 Email: ${payload.email || 'N/A'}`);
        console.log(`🔐 Role: ${payload.role || 'N/A'}`);
        console.log(`🏢 Unit ID: ${payload.unitId || 'N/A'}`);
        
        // Verificar expiração
        if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            const now = new Date();
            const isExpired = now > expDate;
            
            console.log(`⏰ Expira em: ${expDate.toLocaleString()}`);
            console.log(`📅 Agora: ${now.toLocaleString()}`);
            console.log(`${isExpired ? '❌ TOKEN EXPIRADO!' : '✅ Token válido'}`);
        }
        
        // Verificar permissões
        console.log('\n--- PERMISSÕES ---');
        if (payload.role === 'super_admin') {
            console.log('✅ super_admin - PODE configurar qualquer unidade');
        } else if (payload.unitId) {
            console.log(`⚠️  ${payload.role} - SÓ pode configurar unidade: ${payload.unitId}`);
            console.log('   Se tentar configurar outra unidade: 403 Forbidden');
        } else {
            console.log('❌ Usuário sem unitId - NÃO pode configurar nenhuma unidade');
        }
        
    } catch (e) {
        console.error('❌ Erro ao decodificar:', e.message);
    }
    
    rl.close();
});
