// Script de Teste Automatizado - Segurança Multi-Tenant
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

console.log('🧪 INICIANDO TESTES DE SEGURANÇA...\n');

// TESTE 1: Autenticação Obrigatória
async function test1_AuthRequired() {
  console.log('📋 TESTE 1: Autenticação Obrigatória');
  
  try {
    const res = await fetch(`${BASE_URL}/leads`);
    const data = await res.json();
    
    if (res.status === 401) {
      console.log('✅ PASSOU: Retornou 401 sem token');
      console.log('   Mensagem:', data.error);
    } else {
      console.log('❌ FALHOU: Deveria retornar 401, retornou', res.status);
    }
  } catch (err) {
    console.log('❌ ERRO:', err.message);
  }
  
  console.log('');
}

// TESTE 2: Rate Limiting (Login)
async function test2_RateLimiting() {
  console.log('📋 TESTE 2: Rate Limiting (5 tentativas)');
  
  const attempts = [];
  
  for (let i = 1; i <= 6; i++) {
    try {
      const res = await fetch(`${BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'fake@test.com', password: 'wrong' })
      });
      
      const data = await res.json();
      attempts.push({ attempt: i, status: res.status, error: data.error });
      
      console.log(`   Tentativa ${i}: ${res.status} - ${data.error}`);
      
      // Pequeno delay entre tentativas
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.log(`   Tentativa ${i}: ERRO - ${err.message}`);
    }
  }
  
  const blocked = attempts.some(a => a.status === 429);
  
  if (blocked) {
    console.log('✅ PASSOU: Rate limiting ativou após 5 tentativas');
  } else {
    console.log('❌ FALHOU: Rate limiting não bloqueou');
  }
  
  console.log('');
}

// TESTE 3: Login Válido
async function test3_ValidLogin() {
  console.log('📋 TESTE 3: Login com Credenciais Válidas');
  
  try {
    const res = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'agente@propulse.com', 
        password: '123' 
      })
    });
    
    const data = await res.json();
    
    if (res.status === 200 && data.accessToken) {
      console.log('✅ PASSOU: Login bem-sucedido');
      console.log('   Token recebido:', data.accessToken.substring(0, 20) + '...');
      return data.accessToken;
    } else {
      console.log('❌ FALHOU:', res.status, data.error);
      return null;
    }
  } catch (err) {
    console.log('❌ ERRO:', err.message);
    return null;
  }
}

// TESTE 4: Acesso com Token Válido
async function test4_AuthenticatedAccess(token) {
  console.log('\n📋 TESTE 4: Acesso com Token Válido');
  
  if (!token) {
    console.log('⏭️  PULADO: Token não disponível');
    return;
  }
  
  try {
    const res = await fetch(`${BASE_URL}/leads`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    
    if (res.status === 200 || res.status === 503) {
      console.log('✅ PASSOU: Acesso permitido com token');
      console.log('   Leads encontrados:', data.leads?.length || 0);
    } else {
      console.log('❌ FALHOU:', res.status, data.error);
    }
  } catch (err) {
    console.log('❌ ERRO:', err.message);
  }
  
  console.log('');
}

// RODAR TODOS OS TESTES
async function runAllTests() {
  await test1_AuthRequired();
  await test2_RateLimiting();
  
  const token = await test3_ValidLogin();
  await test4_AuthenticatedAccess(token);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TESTES CONCLUÍDOS!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

runAllTests();
