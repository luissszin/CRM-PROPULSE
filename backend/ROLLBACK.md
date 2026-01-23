# Plano de Rollback & Resposta a Incidentes (Backend)

Criado em: 2026-01-22
Versão: 1.0 (Pós-Hardening)

## 🚨 Sinais de Alerta (Quando ativar)

1. **Erros 500 em pico**: Monitorar logs se erros `INTERNAL_SERVER_ERROR` passarem de 5% das requests.
2. **Auth Failures em massa**: Se usuários legítimos (ou webhooks) começarem a receber 401/403 consistentemente.
3. **Webhooks Quebrados**: Se Z-API/Evolution receberem 4xx/5xx e pararem de entregar mensagens.
4. **Latency Spike**: Latência média > 1s por mais de 5 minutos.

## 🔄 Estratégia de Rollback

### Opção A: Reverter Deploy (Git/Container)

Se o problema for código (bug lógico introduzido):

1. **Check Version**: Identificar versão estável anterior (ex: `v0.9.9`).
   ```bash
   git checkout v0.9.9
   # OU no Docker/K8s
   docker rollback crm-backend
   ```
2. **Dependências**: Se houve mudança de `package.json`, rodar `npm ci` novamente.
3. **Migrations**: Se houve migration de banco reversível:
   ```bash
   # (Exemplo hipotético se usar ferramenta de migração)
   npm run db:migrate:down
   ```
4. **Restart**: Reiniciar serviço `pm2 restart all` ou equivalente.

### Opção B: Feature Flag / Env Var (Configuração)

Se o problema for configuração ou Toggle (ex: novo Rate Limit muito agressivo):

1. **Bypass de Emergência (Testes)**:
   - Adicionar `ENABLE_TEST_BYPASS=true` no `.env` (CUIDADO: isso reduz segurança, usar apenas para diagnóstico crítico).
2. **Relaxar Rate Limit**:
   - Aumentar limites no código e redeploy rápido, ou variáveis de ambiente se suportado.
3. **Webhooks Legados**:
   - Se os webhooks pararam de funcionar porque os parceiros não atualizaram URLs, reverta a mudança do arquivo `serve.js` que força o `410 Gone` (comente a linha `app.use(legacyRoutes)`).

## 🛡️ Checklist de Incident Response

1. **ACK**: Reconhecer o incidente e notificar time/stakeholders.
2. **ISOLATE**:
   - O problema é DB? (Supabase down?) -> Checar status page do Supabase.
   - O problema é Auth? (JWT expirado/rotação de chaves?) -> Validar `JWT_ACCESS_SECRET`.
   - O problema é Webhook? -> Checar logs filtrando por `[WHATSAPP]`.
3. **MITIGATE**: Aplicar Rollback (Opção A ou B).
4. **VERIFY**: Rodar smoke tests (`npm test`) em produção/stagin.
5. **RCA (Root Cause Analysis)**: Após estabilizar, investigar logs mascarados (`[MASKED]`) para entender origem.

## 📦 Tags e Versionamento Recomendado

Usar **Semantic Versioning**:

- `v1.0.0`: Release estável (Hardening completo).
- `v1.0.1`: Patches de segurança urgentes.
- `v1.1.0`: Novas funcionalidades (ex: novos providers).

**Tag Atual Recomendada**: `v1.0.0-rc1` (Release Candidate)
Previsão GA: `v1.0.0` após 48h de estabilidade.
