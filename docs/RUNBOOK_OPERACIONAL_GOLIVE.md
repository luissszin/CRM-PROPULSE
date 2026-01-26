# 📖 Runbook Operacional: GO-LIVE CRM Propulse

> **Status:** Próximo do GO-LIVE
> **Versão:** 1.0.0

## 1. Verificações Pré-Deploy (Infrastructure)

### A. Railway: Evolution API

Obrigatório configurar corretamente para evitar erro 404.

- [ ] **Variável PORT:** Definida como `8080`.
- [ ] **Service Port (Networking):** Definido como `8080`.
- [ ] **Health Check:** `curl https://sua-evolution-api.up.railway.app/` deve retornar JSON de boas-vindas.

### B. Railway: CRM Backend

- [ ] **NODE_ENV:** `production`.
- [ ] **EVOLUTION_API_URL:** URL HTTPS da Evolution (sem barra no final).
- [ ] **EVOLUTION_API_KEY:** Deve ser IGUAL à `AUTHENTICATION_API_KEY` da Evolution.
- [ ] **BASE_URL:** URL HTTPS do seu CRM (Necessário para Webhook automático).

---

## 2. Deploy & Migrations

1. **Deploy de Código:**

   ```bash
   git push railway main
   ```

2. **Banco de Dados (Automations):**
   Executar o script SQL `backend/db/migrations/20260126_automation_engine.sql` no Supabase SQL Editor.

---

## 3. Procedimento de Conexão WhatsApp (Dia D)

1. Acesse o CRM como **Super Admin**.
2. Vá em **Configurações > Integrações**.
3. Verifique se o Webhook e API Key estão preenchidos (se não, o sistema deve preencher ao conectar).
4. Vá em **Unidades > (Sua Unidade) > WhatsApp**.
5. Clique em **Nova Conexão**.
   - Nome: "Comercial Principal"
   - Provedor: Evolution
6. Aguarde o QR Code.
   - _Se demorar más de 10s:_ Verifique logs do backend. O frontend fará polling.
7. Escaneie o QR Code.
8. Status deve mudar para **Conectado**.

---

## 4. Testes de Fumaça (Smoke Tests)

### Teste 1: Envio de Mensagem (Outbound)

1. Vá para uma conversa ou crie um Lead com seu número pessoal.
2. Envie um "Olá Teste".
3. Verifique se chegou no seu celular.

### Teste 2: Recebimento & Automação (Inbound)

1. Responda "Teste Recebido" do seu celular.
2. Verifique se apareceu no Chat do CRM.
3. Se houver automação configurada para `message_received`, verifique se disparou (ex: Tag adicionada).

---

## 5. Troubleshooting (Resolução de Problemas)

| Sintoma                  | Causa Provável                    | Solução                                    |
| :----------------------- | :-------------------------------- | :----------------------------------------- |
| **Erro 404 ao Conectar** | Porta errada na Evolution         | Ajustar PORT=8080 no Railway.              |
| **Erro 401 ao Conectar** | API Key divergente                | Igualar chaves no Railway.                 |
| **QR Code não aparece**  | Timeout do Baileys                | Aguardar e tentar novamente. Ver logs.     |
| **Automação não roda**   | Gatilho inativo ou condição falsa | Verificar Logs em `automation_executions`. |

---

**Suporte N3:** Contatar Time de Desenvolvimento (Antigravity).
