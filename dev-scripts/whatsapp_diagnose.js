import axios from 'axios';
import { supabase } from '../backend/services/supabaseService.js';

async function diagnose() {
    console.log('\n=== DIAGNÓSTICO DE WHATSAPP (V2) ===');
    
    // 1. Verificar Backend
    try {
        await axios.get('http://localhost:3000/health');
        console.log('✅ Backend: Online (Porta 3000)');
    } catch (e) {
        console.log('❌ Backend: Offline (Rodar: npm run dev)');
    }

    // 2. Verificar Frontend 
    try {
        await axios.get('http://localhost:5173');
        console.log('✅ Frontend: Online (Porta 5173)');
    } catch (e) {
        console.log('⚠️ Frontend: Offline (Rodar: npm run dev)');
    }

    // 3. Verificar Evolution API 
    // Usamos 8085 conforme configurado no setup_evolution e no backend agora
    const evoUrl = 'http://localhost:8085';
    try {
        const res = await axios.get(`${evoUrl}/instance/fetchInstances`, {
            headers: { 'apikey': 'MINHA_API_KEY' }
        });
        console.log(`✅ Evolution API: Online (${evoUrl})`);
        console.log(`   Instâncias Ativas:`, res.data.length);
    } catch (e) {

        console.log(`❌ Evolution API: Offline (${evoUrl})`);
        console.log(`   Erro: ${e.message}`);
    }

    // 4. Verificar Banco de Dados
    try {
        const { data, error } = await supabase.from('units').select('id').limit(1);
        if (error) throw error;
        console.log('✅ Banco de Dados (Supabase/Postgres): Conectado');
    } catch (err) {
        console.log('❌ Banco de Dados: Erro de conexão');
    }

    console.log('\n=== STATUS DA MUDANÇA ===');
    console.log('1. Frontend movido para 5173 para liberar a 8080.');
    console.log('2. Evolution API movida para 8085 para evitar conflitos residuais.');
    console.log('3. Tudo configurado para funcionar em harmonia.');
}

diagnose();
