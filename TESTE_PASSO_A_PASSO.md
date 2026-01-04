# 🚀 PASSO A PASSO - TESTAR SISTEMA COMPLETO

## ✅ PASSO 1: REINICIAR BACKEND (Carregar Melhorias)

### Windows (PowerShell):

```powershell
# Parar o backend atual
Ctrl + C no terminal onde npm run dev está rodando

# OU forçar parada:
Get-Process node | Stop-Process -Force

# Reiniciar
npm run dev
```

Você deve ver no console:

```
✅ Backend rodando na porta 3000
✅ In-Memory DB initialized
```

---

## 🧪 PASSO 2: TESTAR SEGURANÇA (Rate Limiting)

### Teste 1: Login com Limite de Tentativas

Abra um novo terminal e execute:

```bash
# Tentativa 1 (deve falhar)
curl -X POST http://localhost:3000/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"fake@test.com\",\"password\":\"wrong\"}"

# Tentativa 2 (deve falhar)
curl -X POST http://localhost:3000/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"fake@test.com\",\"password\":\"wrong\"}"

# Tentativa 3 (deve falhar)
curl -X POST http://localhost:3000/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"fake@test.com\",\"password\":\"wrong\"}"

# Tentativa 4 (deve falhar)
curl -X POST http://localhost:3000/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"fake@test.com\",\"password\":\"wrong\"}"

# Tentativa 5 (deve falhar)
curl -X POST http://localhost:3000/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"fake@test.com\",\"password\":\"wrong\"}"

# Tentativa 6 (deve retornar 429 - Too Many Requests)
curl -X POST http://localhost:3000/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"fake@test.com\",\"password\":\"wrong\"}"
```

**Resultado Esperado:**

```json
{
  "error": "Too many login attempts, please try again in 15 minutes."
}
```

✅ **SUCESSO:** Rate limiting está funcionando! O atacante está bloqueado.

---

## 🔒 PASSO 3: TESTAR AUTENTICAÇÃO OBRIGATÓRIA

### Teste 2: Acessar Leads SEM Token (deve falhar)

```bash
curl http://localhost:3000/leads
```

**Resultado Esperado:**

```json
{
  "error": "Missing or invalid authorization header"
}
```

✅ **SUCESSO:** Autenticação obrigatória está funcionando!

---

## 🛡️ PASSO 4: TESTAR ISOLAMENTO MULTI-TENANT

### Teste 3: Criar Super Admin e 2 Unidades

```bash
# 1. Login como Super Admin (se não existir, terá que criar)
curl -X POST http://localhost:3000/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@propulse.com\",\"password\":\"admin123\"}"
```

**Se falhar (401)**, significa que o super admin não existe. Vou criar um script para você:

---

## 📝 PASSO 5: CRIAR DADOS DE TESTE (Se Necessário)

Crie um arquivo temporário `test_setup.js`:

```javascript
import { supabase } from "./backend/services/supabaseService.js";
import bcrypt from "bcrypt";

async function setup() {
  console.log("🔧 Criando Super Admin...");

  const hashedPassword = await bcrypt.hash("admin123", 10);

  const { data, error } = await supabase.from("users").insert({
    email: "admin@propulse.com",
    password: hashedPassword,
    name: "Super Admin",
    role: "super_admin",
  });

  if (error) {
    console.error("Erro:", error.message);
  } else {
    console.log("✅ Super Admin criado:", data);
  }
}

setup();
```

Execute:

```bash
node test_setup.js
```

---

## 🎯 PASSO 6: TESTAR FLUXO COMPLETO

### 6.1 Login

```bash
curl -X POST http://localhost:3000/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@propulse.com\",\"password\":\"admin123\"}"
```

**Copie o `accessToken` da resposta.**

### 6.2 Criar Unidade A

```bash
curl -X POST http://localhost:3000/admin/units ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer SEU_TOKEN_AQUI" ^
  -d "{\"name\":\"Unidade A\",\"slug\":\"unidade-a\"}"
```

### 6.3 Criar Lead na Unidade A

```bash
curl -X POST http://localhost:3000/leads ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer SEU_TOKEN_AQUI" ^
  -d "{\"unit_id\":\"ID_DA_UNIDADE_A\",\"name\":\"João\",\"phone\":\"5511999999999\",\"source\":\"website\"}"
```

### 6.4 Tentar Acessar Lead com Usuário de Outra Unidade

(Este teste requer criar um segundo usuário em outra unidade)

---

## 📊 PASSO 7: VERIFICAR LOGS ESTRUTURADOS

No terminal do backend, você deve ver logs coloridos:

```
[INFO] 23:45:12 - User authenticated { userId: '123', email: 'admin@propulse.com' }
[WARN] 23:45:30 - Rate limit exceeded { ip: '::1', path: '/admin/login' }
[ERROR] 23:46:00 - 🚨 SECURITY: Cross-tenant access attempt detected
```

---

## ✅ PASSO 8: RODAR TESTES AUTOMATIZADOS

```bash
# Teste de segurança
npx jest backend/tests/security_isolation.test.ts

# Todos os testes
npx jest
```

**Resultado Esperado:**

```
✅ Security: Multi-Tenant Isolation
  ✅ should block user from accessing leads of another unit
  ✅ should reject requests without token
  ✅ should block excessive login attempts
```

---

## 🌐 PASSO 9: TESTAR FRONTEND

### 9.1 Abrir no Navegador

```
http://localhost:5173/demo
```

### 9.2 Fazer Login

- Email: `agente@propulse.com`
- Senha: `123`

### 9.3 Ir para WhatsApp Config

```
http://localhost:5173/demo/whatsapp
```

### 9.4 Criar Nova Conexão

1. Clique em "Nova Conexão"
2. Escolha "Evolution API"
3. Digite um nome: "Teste 01"
4. Deixe URL e API Key vazios (usa as do .env)
5. Clique em "Salvar Conexão"

**Resultado Esperado:**

- ✅ Toast verde: "Sucesso! Nova conexão configurada com sucesso."
- ✅ Card da conexão aparece
- ✅ Botão "Conectar" fica disponível

---

## 🎉 PASSO 10: VERIFICAR TUDO FUNCIONANDO

### Checklist Final:

- [ ] Backend reiniciado sem erros
- [ ] Rate limiting bloqueando após 5 tentativas
- [ ] Autenticação obrigatória em /leads
- [ ] Logs estruturados aparecendo no console
- [ ] Frontend carregando corretamente
- [ ] Modal de WhatsApp abrindo e salvando
- [ ] Toast de sucesso/erro funcionando

---

## 🚨 SE ALGO DER ERRADO

### Erro: "Cannot find module 'pino'"

```bash
cd backend
npm install pino pino-pretty
cd ..
npm run dev
```

### Erro: "Rate limit exceeded" mesmo sem fazer nada

```bash
# Reiniciar backend para limpar memória
Ctrl + C
npm run dev
```

### Erro: "Missing authorization header"

```bash
# Isso é esperado! Significa que a autenticação está funcionando.
# Você precisa do token do login.
```

---

## 📞 PRÓXIMO PASSO

Depois de testar tudo localmente, posso te ajudar com:

1. **Deploy em Produção** (Railway, Vercel, AWS)
2. **Configurar HTTPS**
3. **Adicionar mais testes E2E**
4. **Otimizar Frontend** (lazy loading, bundle size)

**Qual você quer fazer?** 🚀
