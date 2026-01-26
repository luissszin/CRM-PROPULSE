# 🤖 Modelo de Automação "Kommo-Style" (CRM Propulse)

Este documento descreve a arquitetura do motor de automação implementado no CRM Propulse, inspirado no modelo do Kommo (antigo AmoCRM).

## 1. Visão Geral

O sistema baseia-se em quatro pilares fundamentais:

1.  **Gatilhos (Triggers):** O "quando" acontece.
2.  **Condições (Conditions):** O "se" deve continuar.
3.  **Ações (Actions):** O "o que" fazer.
4.  **Fluxos (Flows):** O contêiner que agrupa tudo isso.

---

## 2. Estrutura de Dados (Banco de Dados)

O modelo relacional foi normalizado para permitir flexibilidade e performance.

### `automation_flows`

Define o ponto de entrada da automação.

- `trigger_type`: Evento que inicia o fluxo (ex: `lead_created`, `stage_changed`, `message_received`).
- `trigger_config`: Filtros iniciais do gatilho (ex: `stage_id` específico).

### `automation_conditions` (Guard Clauses)

Regras que DEVEM ser verdadeiras para o fluxo continuar. Se falhar, o fluxo para.

- `field`: Campo a verificar (ex: `lead.tags`).
- `operator`: Operação lógica (`equals`, `contains`, `is_set`, `gt`, `lt`).
- `value`: Valor esperado.

### `automation_actions`

Passos a serem executados sequencialmente.

- `type`: Tipo da ação (`send_whatsapp`, `move_stage`, `add_tag`, `wait`).
- `config`: Configuração específica da ação (JSON).
- `execution_order`: Ordem de execução (1, 2, 3...).

### `automation_executions`

Log de auditoria de cada vez que um fluxo rodou.

- `status`: `processing`, `completed`, `failed`.
- `context`: Snapshot dos dados naquele momento.

---

## 3. Gatilhos Suportados

| Gatilho            | Descrição                     | Contexto Disponível        |
| :----------------- | :---------------------------- | :------------------------- |
| `lead_created`     | Novo lead entra no sistema    | Dados do Lead              |
| `stage_changed`    | Lead muda de etapa no funil   | Lead, Old Stage, New Stage |
| `message_received` | Mensagem de WhatsApp recebida | Lead, Mensagem, Contato    |
| `tag_added`        | Tag é adicionada a um lead    | Lead, Tag                  |

---

## 4. Ações Suportadas

| Ação            | Configuração Necessária (`config`)   | Descrição                                       |
| :-------------- | :----------------------------------- | :---------------------------------------------- |
| `send_whatsapp` | `{ "message": "Olá {{lead.name}}" }` | Envia template ou texto via WhatsApp conectado. |
| `move_stage`    | `{ "stage": "negotiation" }`         | Move o lead para outra coluna do Kanban.        |
| `add_tag`       | `{ "tag": "quente" }`                | Adiciona tag para segmentação.                  |
| `wait`          | `{ "delay_seconds": 3600 }`          | Pausa a execução (fila de espera).              |

---

## 5. Exemplo de Fluxo (JSON)

**Cenário:** Quando um novo lead chega na etapa "Novo", enviar WhatsApp de boas-vindas se tiver telefone.

**Flow:**

```json
{
  "name": "Boas Vindas WhatsApp",
  "trigger_type": "lead_created",
  "trigger_config": { "status": "new" }
}
```

**Condition:**

```json
{
  "field": "lead.phone",
  "operator": "is_set",
  "value": true
}
```

**Actions:**

1. **Send WhatsApp**
   ```json
   {
     "type": "send_whatsapp",
     "config": { "message": "Olá {{lead.name}}, tudo bem?" }
   }
   ```
2. **Move Stage**
   ```json
   {
     "type": "move_stage",
     "config": { "stage": "contacted" }
   }
   ```

---

## 6. Arquitetura Técnica

O motor reside em `backend/services/automation/engine.js`. Ele é **Event-Driven**:

1. O backend emite eventos (em `leads.js`, `whatsappWebhook.js`).
2. O `AutomationEngine` escuta, busca fluxos compatíveis no DB.
3. Avalia condições em memória.
4. Executa ações sequencialmente.
5. Registra tudo em `automation_executions`.
