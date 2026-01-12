# 🚀 PROPULSE CRM - Backend & Frontend

Bem-vindo ao projeto PROPULSE! Este repositório contém o backend e o frontend de um CRM Multi-Tenant robusto.
Este guia foi organizado para ajudá-lo a entender a estrutura, rodar o projeto e contribuir, mesmo que você esteja começando agora.

---

## 📂 Estrutura do Projeto

Para manter tudo organizado, separamos o código da seguinte forma:

```
/crm-backend
├── backend/            # 🧠 O "Cérebro" do sistema (API Node.js/Express)
│   ├── routes/         # Onde definimos as URLs (ex: /leads, /messages)
│   ├── services/       # A lógica de negócio (ex: enviar WhatsApp, salvar no banco)
│   ├── middleware/     # Guardas de segurança (ex: verificar login, limitar acessos)
│   ├── db/             # Arquivos do banco de dados (Migrações SQL, Schemas)
│   └── scripts/        # Scripts úteis específicos do backend
│
├── frontend/           # 🎨 A "Cara" do sistema (React/Vite)
│   ├── src/            # Código fonte do site
│   │   ├── pages/      # As telas do sistema
│   │   ├── components/ # Botões, Inputs, Cards reutilizáveis
│   │   ├── lib/        # Funções ajudantes (API, utilitários)
│   │   └── store/      # Gerenciamento de estado (Zustand)
│   └── dist/           # Versão final gerada para produção (Build)
│
├── dev-scripts/        # 🛠️ Ferramentas para desenvolvedores (testes manuais, diagnósticos)
├── docs/               # 📚 Documentação detalhada e manuais
└── package.json        # Configurações do projeto e lista de dependências
```

---

## 🚦 Como Rodar o Projeto

### Pré-requisitos

- Node.js instalado.
- Arquivo `.env` configurado (peça ao líder do projeto ou copie de `.env.example`).

### 1. Instalar tudo

Abra o terminal na pasta raiz e rode:

```bash
npm install
```

_Isso baixa as bibliotecas necessárias para o projeto funcionar._

### 2. Rodar em Modo Desenvolvimento

Para ligar o Backend e o Frontend ao mesmo tempo:

```bash
npm run dev
```

- **Frontend**: Acesse `http://localhost:8080`
- **Backend API**: Roda em `http://localhost:3000`

---

## 🛠️ Comandos Úteis

| Comando         | O que faz?                                                 |
| :-------------- | :--------------------------------------------------------- |
| `npm run dev`   | Inicia o projeto completo (Front + Back).                  |
| `npm run build` | Compila o Frontend para produção (pasta /dist).            |
| `npm test`      | Roda os testes automáticos para garantir que nada quebrou. |

---

## 📚 Documentação Extra

Se você tiver dúvidas específicas, consulte a pasta `docs/`:

- **INSTALLATION.md**: Guia completo de instalação do zero.
- **WHATSAPP_INTEGRATION.md**: Como funciona o envio de mensagens.
- **PRODUCTION_CHECKLIST.md**: O que conferir antes de colocar o site no ar.

---

## 💡 Dicas para Iniciantes (Junior Devs)

1. **Backend Crash?**: Se o backend parar, verifique o terminal. Geralmente ele diz qual arquivo e linha deu erro.
2. **Tela Branca?**: Abra o Console do Navegador (F12) e veja se tem erros em vermelho.
3. **Novas Funcionalidades**:
   - Comece criando a rota no `backend`.
   - Teste com Postman ou Insomnia.
   - Depois crie a tela no `frontend` que chama essa rota.

---

_Mantenha o código limpo e divirta-se codando!_ 🚀
