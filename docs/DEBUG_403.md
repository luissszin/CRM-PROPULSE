# 🔍 Guia de Diagnóstico do Erro 403 Forbidden

## O que fazer AGORA:

### Opção 1: Ver os logs do backend (MAIS RÁPIDO)

1. Vá até o terminal onde está rodando `npm run dev:backend`
2. Tente conectar novamente no frontend
3. **PROCURE** por esta mensagem nos logs:
   ```
   [WhatsApp Connect] Authorization check:
   ```
4. Copie e cole aqui TODA a saída dessa mensagem
5. Ela mostrará EXATAMENTE por que você está sendo bloqueado

### Opção 2: Verificar seu JWT

1. Abra o DevTools (F12) no navegador
2. Vá em: **Application** → **Local Storage** → `http://localhost:5173`
3. Procure por `propulse-crm-storage`
4. Copie o valor COMPLETO
5. Cole em um editor de texto
6. Procure por `"accessToken":` e copie o valor (sem aspas)
7. No terminal, rode:
   ```bash
   node scripts/diagnose_jwt.js
   ```
8. Cole o token quando solicitado

---

## Cenários Possíveis:

### ❌ Cenário 1: Você NÃO é super_admin

**Sintoma nos logs:**

```
userRole: 'agent'  (ou 'admin')
isSuperAdmin: false
```

**Solução:** Você está tentando configurar uma unidade que não é a sua.

**Como resolver:**

1. Faça logout
2. Faça login como `admin@propulse.com` / `admin123` (super_admin)
3. OU navegue para a URL da SUA unidade, não de outra

---

### ❌ Cenário 2: UnitId não bate

**Sintoma nos logs:**

```
requestedUnitId: 'abc-123'
userUnitId: 'xyz-789'
unitIdsMatch: false
403: Unit mismatch
```

**Solução:** Você está tentando configurar unidade 'abc-123', mas pertence à 'xyz-789'

**Como resolver:**
Mude a URL para: `http://localhost:5173/[SEU_SLUG]/whatsapp`
Para descobrir seu slug, acesse: `http://localhost:5173/select-unit`

---

### ❌ Cenário 3: Token expirado

**Sintoma:**

```
❌ TOKEN EXPIRADO!
```

**Solução:**

1. Faça logout (canto superior direito)
2. Faça login novamente
3. Tente conectar o WhatsApp

---

### ✅ Se você É super_admin e ainda dá 403:

Isso seria muito estranho, mas vamos debugar:

1. Verifique se o token JWT tem `"role": "super_admin"`
2. Nos logs do backend, deve mostrar:
   ```
   isSuperAdmin: true
   ✅ Authorization passed
   ```
3. Se mostrar isso e AINDA der 403, há outro middleware bloqueando

---

## Teste Rápido:

**Faça login como admin padrão:**

1. Vá para: `http://localhost:5173/login`
2. Email: `admin@propulse.com`
3. Senha: `admin123`
4. Após login, vá para qualquer unidade
5. Tente conectar WhatsApp
6. Deve funcionar (você é super_admin)

---

## Próximos Passos:

**AGORA:**

1. Tente conectar novamente no frontend
2. Copie os logs que aparecerem com `[WhatsApp Connect]`
3. Cole aqui para eu analisar

**OU:**

Execute o diagnóstico do token:

```bash
node scripts/diagnose_jwt.js
```

E cole o resultado completo aqui.

Assim saberei EXATAMENTE o que está bloqueando você! 🚀
