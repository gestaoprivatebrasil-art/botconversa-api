# 🤖 API "Cabeça" pro BotConversa

API com IA gratuita pra responder clientes do BotConversa automaticamente. Foco em vendas no mercado financeiro, com memória de conversa por cliente.

## 🎯 Como funciona

```
Cliente manda msg no WhatsApp
        ↓
   BotConversa
        ↓
  Sua API (essa aqui) ──→ Groq (IA Llama 3.3 70B)
        ↓
   Resposta volta pro cliente
```

## ⚙️ Passo a passo pra colocar no ar

### 1. Pegar sua chave da Groq (grátis)

1. Acesse https://console.groq.com/keys
2. Crie conta com email (sem cartão de crédito)
3. Clique em "Create API Key"
4. Copie a chave (começa com `gsk_...`)

### 2. Rodar localmente pra testar

```bash
# Instalar dependências
npm install

# Copiar arquivo de variáveis
cp .env.example .env

# Edite o .env e cole sua chave do Groq

# Rodar
npm start
```

A API vai abrir em `http://localhost:3000`

### 3. Testar antes de subir

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "5521999999999",
    "nome_cliente": "João",
    "mensagem": "Oi, quero saber sobre os cursos de trading"
  }'
```

### 4. Subir online (grátis)

Você precisa hospedar a API em algum lugar pra o BotConversa conseguir chamar. Opções gratuitas:

- **Render.com** (recomendado, fácil) — https://render.com
- **Railway.app**
- **Fly.io**

Subindo no Render:
1. Suba o código no GitHub
2. Em render.com → New → Web Service → conecta seu repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Em "Environment", adicione `GROQ_API_KEY` com sua chave
6. Render te dá uma URL tipo `https://sua-api.onrender.com`

### 5. Conectar no BotConversa

No BotConversa, no fluxo onde você quer a IA responder:

1. Adicione um bloco **"Requisição HTTP"** (ou "Webhook")
2. Configure:
   - **Método**: POST
   - **URL**: `https://sua-api.onrender.com/chat`
   - **Headers**: `Content-Type: application/json`
   - **Body** (JSON):
     ```json
     {
       "cliente_id": "{{telefone}}",
       "nome_cliente": "{{nome}}",
       "mensagem": "{{ultima_mensagem}}"
     }
     ```
   *(adapte os nomes das variáveis pros que o BotConversa usa)*

3. Salve a resposta da API em uma variável (ex: `resposta_ia`)
4. No próximo bloco, envie `{{resposta_ia.resposta}}` pro cliente
5. Use `{{resposta_ia.transferir_humano}}` pra decidir se transfere pra atendente humano

## 🔧 Personalizar a IA

Abra o arquivo `index.js` e edite a constante `SYSTEM_PROMPT`. É lá que você define:
- A personalidade do atendente
- Os produtos que ele vende e os preços
- As regras (ex: nunca prometer rentabilidade)
- O tom (formal, descontraído, etc.)

## 📊 Endpoints disponíveis

| Método | URL | O que faz |
|--------|-----|-----------|
| GET | `/` | Healthcheck (ver se tá no ar) |
| POST | `/chat` | Recebe mensagem, devolve resposta da IA |
| POST | `/resetar` | Limpa o histórico de um cliente |

## ⚠️ Limitações do plano grátis (Groq)

- 30 requisições por minuto
- 14.400 requisições por dia
- 6.000 tokens por minuto

Pra um negócio começando, sobra. Se você crescer e bater o limite, dá pra colocar cartão e pagar centavos por uso.

## 🛠️ Próximos passos (quando crescer)

- Trocar memória RAM por **Redis** (não perde histórico se reiniciar)
- Adicionar **banco de dados** pra salvar leads qualificados
- Integrar com seu **CRM** (Pipedrive, RD Station, etc.)
- Adicionar **logs** estruturados
- Adicionar autenticação (token secreto entre BotConversa e API)
