# Setup Rápido: Evolution API com Docker

Este guia explica como subir a Evolution API rapidamente em ambiente de desenvolvimento (Windows/Linux/Mac) usando Docker puro.

## 1. Pré-requisitos
- **Docker** instalado e rodando.
- Terminal (PowerShell, CMD ou Bash).

## 2. Comando para Subir o Container

Execute o seguinte comando no seu terminal:

```bash
docker run -d \
  --name evolution_api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=MINHA_API_KEY \
  atendai/evolution-api:latest
```

### Explicação do Comando:
- `docker run`: Cria e inicia um container.
- `-d`: **Detached mode**. Roda em segundo plano (libera o terminal).
- `--name evolution_api`: Dá o nome fixo "evolution_api" para facilitar comandos futuros (ex: `docker stop evolution_api`).
- `-p 8080:8080`: Mapeia a porta **8080** do seu computador para a porta **8080** do container.
- `-e AUTHENTICATION_API_KEY=MINHA_API_KEY`: Define a **chave mestra** de segurança. Você precisará dela no header `apikey` para qualquer requisição.
- `atendai/evolution-api:latest`: A imagem Docker (versão mais recente) que será baixada e usada.

---

## 3. Validando o Funcionamento

Aguarde cerca de 10 a 20 segundos para o container iniciar completamente.

### Verificar Logs
Se quiser ver se deu tudo certo:
```bash
docker logs -f evolution_api
```
(Ctrl+C para sair dos logs)

### Acessar no Navegador
Abra: **[http://localhost:8080](http://localhost:8080)**

Você verá uma resposta JSON simples confirmando que a API está online:
```json
{
  "status": 200,
  "message": "Welcome to the Evolution API",
  "version": "..."
}
```

---

## 4. Gerenciamento e Documentação

### Swagger (Documentação Interativa)
Acesse: **[http://localhost:8080/docs](http://localhost:8080/docs)**
Use isso para ver todas as rotas disponíveis.

### Manager (Interface Visual - se disponível na versão)
Acesse: **[http://localhost:8080/manager](http://localhost:8080/manager)**
*Nota: Dependendo da versão da imagem, o manager pode estar em outra rota ou desabilitado por padrão.*

---

## 5. Como Testar via API (Exemplos cURL)

Para todas as requisições, você **DEBE** enviar o header:
`apikey: MINHA_API_KEY`

### A. Criar uma Instância (Gerar Conexão)
Isso cria uma "linha" de WhatsApp na API.

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: MINHA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "minha_instancia_01",
    "token": "token_secreto_desta_instancia",
    "qrcode": true
  }'
```
**Resposta esperada:** Um JSON contendo `qrcode` (string base64) para você ler com o celular, ou dados da instância criada.

### B. Ler o QR Code (Conectar)
Se você não pegou o QR Code na criação, chame esta rota:

```bash
curl -X GET http://localhost:8080/instance/connect/minha_instancia_01 \
  -H "apikey: MINHA_API_KEY"
```
Ele retornará o base64 do QR Code. Você pode usar um site como [base64.guru](https://base64.guru/converter/decode/image) para ver a imagem e escanear com seu WhatsApp.

### C. Enviar Mensagem de Texto
Depois de conectado (QR Code lido):

```bash
curl -X POST http://localhost:8080/message/sendText/minha_instancia_01 \
  -H "apikey: MINHA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999", 
    "text": "Olá! Teste via Docker com Evolution API"
  }'
```
*Nota: O número deve incluir o código do país (55) e DDD.*

---

## Resumo para Dev
1. Rode o `docker run`.
2. Acesse `localhost:8080` para confirmar.
3. Use o Postman, Insomnia ou cURL enviando sempre o header `apikey: MINHA_API_KEY`.
