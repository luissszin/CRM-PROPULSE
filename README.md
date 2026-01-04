PROPULSE (CRM Backend + Frontend)
================================

Este projeto é um backend simples de CRM que integra com Z-API (WhatsApp) e Supabase.

O que foi implementado
- Servidor Express com endpoints:
  - `POST /messages` — envia mensagem via Z-API e persiste a mensagem enviada no Supabase
  - `POST /webhook/zapi` — webhook para mensagens recebidas (salva no banco)
  - `GET /admin/messages` — lista as últimas 50 mensagens (JSON) para depuração
- Integração com Supabase usando Service Role Key (apenas no servidor)
- Integração com Z-API com modo simulado (`ZAPI_SKIP_SEND=true`) para testes locais
 - Script de teste `backend/test/sendMessage.js` que tenta o endpoint HTTP (com retry) e faz fallback para envio direto
 - Esquema SQL em `backend/db/schema.sql` (cria `contacts`, `conversations`, `messages`, `units`, `leads`)

Configuração rápida
1) Copie as credenciais do Supabase (no painel do projeto → Settings → API):
	- Project URL → `SUPABASE_URL`
	- Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

2) Atualize o arquivo `.env` na raiz do projeto com essas chaves e as credenciais da Z-API. Exemplo:

```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_...

ZAPI_INSTANCE_ID=...
ZAPI_TOKEN=...
ZAPI_CLIENT_TOKEN=...
ZAPI_SEND_URL=https://api.z-api.io/instances/ID/token/TOKEN/send-text
```

3) Crie o schema no Supabase
	- Abra o SQL Editor e cole o conteúdo de `backend/db/schema.sql`, então execute.

4) Instale dependências (se ainda não instalou):
```
npm install
```

5) Inicie o servidor em modo simulado (não fará chamadas reais ao Z-API):
```
$env:ZAPI_SKIP_SEND='true'; npm run dev
```

Executando com Postgres local (Docker):

1. Inicie Postgres:
```
docker-compose up -d
```

2. Aplique o schema no Postgres local (exemplo `psql`):
```
# aguarde o Postgres subir
psql "postgresql://propulse:propulse@127.0.0.1:5432/propulse" -f backend/db/schema.sql
```

6) Envie uma mensagem de teste (isso persiste no Supabase quando o schema existir):
```
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/messages' -Method POST -ContentType 'application/json' -Body '{"phone":"61982047227","message":"seja bem vindo, \"posso lhe ajudar? \""}'
```

7) Ou rode o script de teste (tenta o endpoint e faz fallback):
```
$env:ZAPI_SKIP_SEND='true'; npm run send-test
```

Observação importante: modo sem Client-Token
- Para sua conveniência, se não houver `ZAPI_CLIENT_TOKEN` no `.env`, o backend irá automaticamente SIMULAR o envio (logando a ação) e retornar sucesso. Isso garante que todo o fluxo do CRM (persistência no Supabase, histórico de mensagens, UI) funcione localmente sem uma conta paga na Z-API. Quando quiser enviar de verdade, adicione `ZAPI_CLIENT_TOKEN` e remova `ZAPI_SKIP_SEND`.

Notas de segurança
- Não comite o arquivo `.env` (contém segredos). O `.gitignore` já inclui `.env`.
- A chave `SUPABASE_SERVICE_ROLE_KEY` tem permissões elevadas; mantenha-a apenas no backend.

Próximos passos possíveis
- Implementar re-tentativa automática para mensagens com `status='failed'` (requeue).
- Adicionar UI administrativa para visualizar/reenviar mensagens.
- Configurar RLS no Supabase para segurança a nível de linha.

Se quiser que eu implemente requeue automático agora, diga "implemente requeue" e eu faço as alterações e testo.

