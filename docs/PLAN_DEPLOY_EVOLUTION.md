# PLAN: Deploy Evolution API em Linux (Railway & VPS)

## 📌 Objetivo

Subir a Evolution API (v2.1.2) em ambiente Linux nativo para garantir a estabilidade do driver Baileys, permitindo a geração de QR Code e integração via Webhooks com o backend CRM Propulse.

---

## 🏗️ Fase 1: Configuração de Ambiente

### 1.1 Opção A: Railway (SaaS/PaaS)

- **Vantagem:** Deploy rápido, Zero-Ops, HTTPS nativo.
- **Configuração:**
  - Criar novo projeto "Empty Project".
  - Adicionar serviço "PostgreSQL" (Provisionar base).
  - Adicionar serviço "Redis" (Provisionar cache).
  - Adicionar serviço "Evolution API" via Docker Image: `atendai/evolution-api:v2.1.2`.
- **Variáveis:** Definir segredos e URLs.

### 1.2 Opção B: VPS Ubuntu (Docker-Compose)

- **Vantagem:** Custo fixo, controle total sobre volumes.
- **Configuração:**
  - Instalar Docker & Docker-Compose.
  - Criar estrutura de pastas: `/opt/evolution/instances`.
  - Configurar `docker-compose.yml` (Evolution + DB + Redis).
- **Permissões:** Ajustar `chmod/chown` para volumes persistentes.

---

## 🧪 Fase 2: Configuração do Provedor (Evolution v2)

### 2.1 Variáveis de Ambiente Críticas

| Variável              | Valor Recomendado       | Motivo                            |
| --------------------- | ----------------------- | --------------------------------- |
| `SERVER_URL`          | `https://sua-vps.com`   | Obrigatório para Webhooks         |
| `DATABASE_PROVIDER`   | `postgresql`            | Estabilidade de dados             |
| `WA_VERSION`          | `[2, 3000, 1015901307]` | Evitar erro de versão do WhatsApp |
| `AUTHENTICATION_TYPE` | `apikey`                | Segurança                         |
| `LOG_LEVEL`           | `info`                  | Logs operacionais                 |

### 2.2 Webhook Engine

- Formato v2: `{ enabled: true, url: "..." }`.
- Eventos obrigatórios: `QRCODE_UPDATED`, `MESSAGES_UPSERT`, `CONNECTION_UPDATE`.

---

## 🚦 Fase 3: Validação & Smoke Tests (Produção)

1.  **Deploy Check:** Confirmar se containers rodam sem restart.
2.  **Health Check:** `curl https://evolution.../health`.
3.  **Instance creation:** POST `/instance/create` com payload v2.
4.  **QR Validation:** GET `/instance/connect/:name` e obter Base64 válida.
5.  **Connection:** Scan e validação no endpoint `/instance/connectionState`.
6.  **Outbound Test:** Enviar mensagem via comando curl direto para a Evolution.

---

## 🛡️ Fase 4: Segurança

- Garantir `AUTHENTICATION_API_KEY` forte.
- Configurar Firewall na VPS (Porta 8080/443 apenas).
- Configurar SSL (Nginx Reverse Proxy na VPS).

---

## ✅ Critérios de Aceite

- [ ] Evolution API acessível via HTTPS.
- [ ] Instância criada responde com QR Code Base64.
- [ ] Scan realizado com sucesso -> Status `connected`.
- [ ] Webhook recebido no Backend CRM (Simulado/Real).
