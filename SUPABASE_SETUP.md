# Configuração Supabase para o projeto (leads)

Este guia mostra como criar a tabela `leads` no seu projeto Supabase e conectar o backend localmente.

Passos rápidos:

1. Abra a extensão Supabase no VS Code ou acesse https://app.supabase.com.
2. No Painel do projeto, abra **SQL Editor**.
3. Abra o arquivo `backend/db/schema.sql` e copie o conteúdo (contém definição de `leads`, `units`, `contacts`, `conversations`, `messages`).
4. Cole o SQL no editor do Supabase e execute (Run). Isso criará as tabelas e índices necessários.

Conectar o backend localmente (usar service role key):

- No Supabase, vá em Settings → API, copie:
  - `Project URL` → `SUPABASE_URL`
  - `Service Role Key` → `SUPABASE_SERVICE_ROLE_KEY` (mantenha esta chave secreta; NÃO coloque no frontend)

- No seu projeto local, crie/edite o arquivo `.env` (já existe na raiz) e coloque:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3000
ZAPI_SKIP_SEND=true
```

- Alternativa: se quiser rodar o script SQL localmente contra a database Postgres, defina `DATABASE_URL` com a connection string (disponível em Settings → Database → Connection string) e execute:

```bash
npm run db:apply
```

Testar:

- Inicie o backend:

```bash
npm run dev
```

- Liste unidades (deve retornar as unidades existentes ou vazias):

```bash
curl http://localhost:3000/leads/units
```

- Crie um lead via backend:

```bash
curl -X POST http://localhost:3000/leads \
  -H "Content-Type: application/json" \
  -d '{"unit_id":"<unit_uuid>", "phone":"5511999999999", "name":"Teste"}'
```

Observações de segurança:

- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` ao frontend. Use o serviço do backend para operações sensíveis.
- Para produção, configure políticas RLS (Row Level Security) adequadas e crie chaves com permissões mínimas para o cliente.

Se quiser, eu posso:
- executar o SQL diretamente no seu projeto Supabase se você me fornecer `SERVICE_ROLE_KEY` (não recomendado enviar aqui); ou
- rodar `npm run db:apply` localmente se você fornecer `DATABASE_URL` como env var; ou
- executar via extensão Supabase no VS Code (se autorizar e me dizer que posso operar no seu ambiente).