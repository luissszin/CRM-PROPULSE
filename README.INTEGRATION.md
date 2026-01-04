Integração com o frontend (impulse-flow-main)
=============================================

Passo a passo para conectar o frontend ao backend e usar dados reais (ou simulados):

1) Mover ou abrir o frontend no workspace
   - Opção A (recomendada): Mova a pasta `impulse-flow-main` para dentro do workspace do backend, por exemplo:
     - Mova `c:\Users\jogod\Downloads\impulse-flow-main` para `c:\Users\jogod\crm-backend\frontend`
   - Opção B: Abra os arquivos do frontend no VS Code (File → Open File) — assim eu consigo acessá-los e mapear as chamadas.

2) Ajustar variáveis de ambiente no frontend
   - No frontend, procure o arquivo onde as URLs de API são configuradas (ex.: `src/lib/utils.ts`, `src/store/crmStore.ts` ou `.env` local).
   - Aponte a variável para o backend local (ex.: `VITE_API_BASE_URL=http://localhost:3000`).

3) Habilitar CORS (já feito)
   - O backend já usa `cors()` sem restrição de origem. Se quiser restringir, atualize `scr/serve.js`.

4) Rodar o backend
   - Instale dependências: `npm install`
   - Crie `.env` a partir de `.env.example` e preencha as chaves do Supabase
   - Crie o schema no Supabase (copie `scr/db/schema.sql` para o SQL editor do Supabase e execute)
   - Rodar em modo dev: (PowerShell)

```powershell
$env:ZAPI_SKIP_SEND='true'; npm run dev
```

5) Rodar o frontend (exemplo com npm/yarn/pnpm)
   - Entre na pasta `frontend` (ou onde você moveu o projeto): `cd frontend`
   - Instale dependências: `npm install`
   - Configure o `.env` do frontend com `VITE_API_BASE_URL=http://localhost:3000`
   - Rode: `npm run dev` (ou `npm run start` conforme o template)

6) Testar fluxo com dados reais
   - Abra o frontend no navegador. Crie leads ou use a UI de Inbox que faz requisições para o backend.
   - Alternativamente, teste via PowerShell:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:3000/messages' -Method POST -ContentType 'application/json' -Body '{"phone":"61982047227","message":"Olá do teste"}'
```

7) O que eu posso fazer agora (opções que eu posso executar para você):
   - Ler o frontend e mapear exatamente quais endpoints o app usa (recomendado).
   - Implementar endpoints REST adicionais esperados pelo frontend (contacts, conversations, inbox, auth).
   - Criar scripts de seed com dados reais de teste (contatos, conversas, mensagens).

Se quiser, eu posso agora:
- A) Mapear automaticamente os endpoints lendo o frontend (se você mover/abrir os arquivos no workspace) ou
- B) Implementar endpoints genéricos (`/contacts`, `/conversations`, `/inbox`) e alguns scripts de seed para popular o Supabase com dados de exemplo.

Diga qual opção prefere que eu execute a seguir.
