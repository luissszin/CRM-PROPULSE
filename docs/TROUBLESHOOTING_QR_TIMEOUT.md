# TROUBLESHOOTING: WhatsApp QR Code não aparece

> Use este guia se você receber o status "Aguardando Provedor" por mais de 2 minutos.

## 🚨 Sintoma

O frontend exibe: _"Aguardando Provedor... Estamos solicitando o QR Code ao Evolution API."_ e o botão "Tentar Novamente Agora" retorna o mesmo aviso (Status 424).

---

## 🔍 Causa 1: Evolution API Inicializando (Normal)

A Evolution API leva cerca de **10 a 30 segundos** para carregar o driver Baileys na primeira conexão de uma instância.

- **Ação:** Aguarde 30 segundos e clique em "Tentar Novamente".

## 🔍 Causa 2: Erro de Versão do WhatsApp (WA_VERSION)

O WhatsApp muda a versão do protocolo frequentemente. Se a versão no `.env` do Evolution estiver obsoleta, a conexão falha silenciosamente.

- **Diagnóstico:** Ver logs do Evolution.
  ```bash
  docker logs evolution_api --tail 50
  # Erro comum: "Connection Closed: 428" ou "Handshake Error"
  ```
- **Solução:** Atualizar `WA_VERSION` no `docker-compose.yml` ou variáveis do Railway.
  ```yaml
  WA_VERSION=[2, 3000, 1015901307] # Versão estável conhecida
  ```

## 🔍 Causa 3: Permissão de Escrita (Filesystem)

O Baileys precisa escrever arquivos de sessão (`creds.json`) na pasta `/evolution/instances`. Se falhar, entra em loop.

- **Diagnóstico:** Ver logs.
  ```bash
  # Erro: "EACCES: permission denied, open '/evolution/instances/...'"
  ```
- **Solução:** Corrigir permissões na VPS.
  ```bash
  sudo chown -R 1000:1000 /opt/evolution/instances
  sudo chmod -R 777 /opt/evolution/instances
  ```

## 🔍 Causa 4: Rede / HTTPS

O Backend não consegue falar com a Evolution.

- **Diagnóstico:** Executar comando `curl` do Backend para Evolution.
  ```bash
  curl -v https://whatsapp.seudominio.com/health
  ```
- **Solução:** Verificar DNS e Firewall (Porta 443/8080).

---

## 🛠️ Comando de Reset Forçado (Último Recurso)

Se a instância travar num estado inválido ("connecting" mas sem QR):

1. **Deletar Instância via API Evolution:**
   ```bash
   curl -X DELETE https://whatsapp.seudominio.com/instance/delete/unit_SEU_ID \
     -H "apikey: SUA_MASTER_KEY"
   ```
2. **Tentar conectar novamente pelo CRM.**
