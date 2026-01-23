# ✅ Correção dos Erros de Conexão WhatsApp

## 📋 Problemas Identificados

### 1. Erro 500 - ENOTFOUND evolution_api

O erro ocorria quando o frontend enviava o campo `apiUrl` como string vazia `""`, e o backend não tratava isso corretamente.

### 2. Erro 403 - Forbidden

O middleware `requireUnitContext` estava bloqueando até mesmo super_admins de configurar unidades, causando **403 Forbidden** ao tentar conectar.

## 🔧 Correções Aplicadas

### 1. **Backend - Sanitização** (`backend/routes/whatsappConnection.js`)

- ✅ Strings vazias em `apiKey`/`apiUrl` tratadas como `undefined`
- ✅ Valores padrão do `.env` são usados quando campos vazios
- ✅ Log de debug adicionado: `[WhatsApp Connect] Config:`

### 2. **Backend - Autorização** (`backend/routes/whatsappConnection.js`)

- ✅ **Removido** `requireUnitContext` middleware dos endpoints de WhatsApp
- ✅ **Validação manual** que permite super_admin acessar qualquer unidade
- ✅ Usuários regulares só podem configurar sua própria unidade
- ✅ Logs de segurança quando tentativa de acesso cruzado

### 3. **Frontend** (`frontend/src/pages/unit/UnitWhatsAppConfig.tsx`)

- ✅ Placeholder corrigido: `8080` (era `8085`)
- ✅ Descrição melhorada: "Deixe vazio para usar configuração padrão"

## 🚀 Como Testar

### 1. Verificar serviços:

```bash
npm run check:whatsapp
```

Esperado:

```
✅ CRM Backend (Port 3000): ONLINE
✅ Evolution API (Port 8080): ONLINE
```

### 2. Acessar:

```
http://localhost:5173/[SEU_SLUG]/whatsapp
```

### 3. Preencher:

- **Provedor:** Evolution API
- **Nome da Instância:** (deixe o sugerido)
- **API Key:** `MINHA_API_KEY`
- **API Base URL:** **VAZIO**

### 4. Clicar "Salvar & Conectar"

- ✅ Status 201 → QR Code aparece
- ❌ Status 403 → Verifique se está logado corretamente
- ❌ Status 503 → Evolution offline: `docker-compose up -d`

## 🔍 Diagnóstico de Problemas

### Erro 403 - Forbidden

**Causa:** Usuário tentando configurar unidade que não pertence a ele.

**Solução:**

1. Se você é **super_admin**, verifique que o token JWT contém `"role": "super_admin"`
2. Caso contrário, use uma unidade à qual você pertence (verifique `req.user.unitId`)

### Erro 500 - Ainda vê ENOTFOUND

**Causa:** Backend usando `.env` antigo ou cache.

**Solução:**

```bash
# Pare o backend (Ctrl+C)
# Verifique .env
cat .env | findstr EVOLUTION
# Deve mostrar: EVOLUTION_API_BASE_URL=http://localhost:8080
# Reinicie
npm run dev:backend
```

### Como verificar seu papel/role:

No DevTools → Application → Local Storage → olhe `propulse-crm-storage`:

```json
{
  "state": {
    "user": {
      "role": "super_admin", // ← deve ser este para configurar qualquer unidade
      "unitId": "..."
    }
  }
}
```

## 📝 Mudanças de Segurança

**Antes:** `requireUnitContext` bloqueava **todos** (incluindo super_admin)  
**Agora:** Validação manual que permite:

- ✅ **super_admin**: configurar qualquer unidade
- ✅ **Usuários regulares**: apenas sua própria unidade (`req.user.unitId`)

## ✨ Resultado Esperado

1. Frontend envia credenciais
2. Backend valida autorização
3. Se vazio, usa `.env` (`http://localhost:8080`)
4. Evolution API gera QR Code
5. QR aparece no navegador (~3s)
6. Escanear com WhatsApp → Status "Conectado"

---

**Última atualização:** 14/01/2026 14:21  
**Status:** ✅ 403 e 500 corrigidos
