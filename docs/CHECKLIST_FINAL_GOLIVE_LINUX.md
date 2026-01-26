# ✅ Checklist Final GO-LIVE (Linux/Railway)

## 🏗️ Infraestrutura (Railway)

- [ ] **Evolution API**
  - [ ] Service Port: `8080` (Aba Settings > Networking)
  - [ ] `AUTHENTICATION_API_KEY`: Definida e segura
  - [ ] `SERVER_URL`: HTTPS correto
  - [ ] Health Check (`/`) retornando 200 OK
- [ ] **CRM Backend**
  - [ ] `BASE_URL`: HTTPS correto
  - [ ] `EVOLUTION_API_URL`: Apontando para Evolution
  - [ ] `EVOLUTION_API_KEY`: Idêntica à da Evolution
  - [ ] `JWT_ACCESS_SECRET`: Definido e forte

## 💾 Banco de Dados (Supabase)

- [ ] Tabelas "Core" criadas (`units`, `users`, `leads`, `messages`)
- [ ] Tabelas "Automation" criadas (`automation_flows`, etc.)
- [ ] Índices de performance aplicados

## 🔄 Fluxos Críticos

- [ ] Login Admin (Token JWT gerado)
- [ ] Criação de Unidade
- [ ] Conexão WhatsApp (QR Code gerado e lido)
- [ ] Webhook registrado automaticamente na Evolution (`/webhook/set`)
- [ ] Envio de mensagem (Outbound)
- [ ] Recebimento de mensagem (Inbound)

## 🤖 Automação

- [ ] Gatilho `lead_created` funcional
- [ ] Ação `send_whatsapp` funcional
- [ ] Logs de execução gravados em `automation_executions`

## 🚀 GO / NO-GO Decision

- **GO:** Todos os itens acima marcados.
- **NO-GO:** Qualquer falha em Conexão WhatsApp ou Login.
