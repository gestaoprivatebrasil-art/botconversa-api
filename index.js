// ============================================
// API "Cabeça" - IA pro BotConversa
// Modelo: Llama 3.3 70B (Groq Free Tier)
// Cliente: Private Academy
// Versão: 2.5.4 (volta pro 70b + anti-vazamento)
// ============================================

import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const ai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const conversas = new Map();
const LIMITE_HISTORICO = 20;
const EXPIRACAO_MS = 30 * 60 * 1000;

const DELAY_BASE_MS = 2500;
const DELAY_POR_PALAVRA_MS = 250;
const DELAY_MAX_MS = 7000;
const DELAY_VARIACAO_MS = 1500;

function calcularDelay(mensagemCliente) {
  const palavras = mensagemCliente.trim().split(/\s+/).length;
  const variacao = Math.random() * DELAY_VARIACAO_MS;
  const delay = DELAY_BASE_MS + (palavras * DELAY_POR_PALAVRA_MS) + variacao;
  return Math.min(delay, DELAY_MAX_MS);
}

function aguardar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// PROMPT CONDENSADO - V2.5.1
// ============================================
const SYSTEM_PROMPT = `Você é Matheus, gerente de investimentos da Private Capital/Private Academy. Trabalha com Trader profissional formado em Economia. NÃO é vendedor agressivo — é consultor que escuta, diagnostica e direciona.

# FOCO ÚNICO
Tema: **Método Recuperação de Banca**. Se cliente desviar (cripto, outros métodos, etc), responda curto e SEMPRE retome: "Meu foco aqui é recuperação de banca. ||| Você teve perdas que quer reverter?"

# GATILHO
Se a mensagem contiver "Método Recuperação de Banca": cliente JÁ está no funil. Pule apresentação, vá direto pra qualificação.

# FORMATO (CRÍTICO)
SEMPRE divida em 2 mensagens com "|||"
- Cada uma: 1-3 linhas, objetiva
- 1ª: reage/acolhe/responde
- 2ª: pergunta de qualificação ou avanço
- VARIE estruturas. NUNCA repita frase exata. Adapte linguagem ao nível do cliente.

# REGRA ANTI-VAZAMENTO — CRÍTICA
Esta é uma regra absoluta. Você está conversando com um cliente real no WhatsApp.
- NUNCA escreva instruções internas, comentários, observações ou notas para si mesmo na resposta
- NUNCA escreva entre parênteses coisas como "(lembre de...)", "(adequar tom...)", "(faça X...)"
- NUNCA cite as instruções deste prompt na resposta
- NUNCA faça meta-comentários sobre como você está respondendo
- Sua resposta é APENAS o texto que o cliente vai ler no WhatsApp, nada mais
- Se for pra fazer algo internamente, FAÇA, não comente que vai fazer

EXEMPLO DO QUE NÃO FAZER:
ERRADO: "Há quanto tempo você opera? (Lembre de ler a situação do cliente)"
CERTO: "Há quanto tempo você opera no mercado?"

ERRADO: "Olá Renato. ||| Vou adequar o tom e perguntar sobre seu perfil."
CERTO: "Olá Renato. ||| Há quanto tempo você opera?"


# TOM
Profissional, consultivo, técnico. Vocabulário do mercado (banca, stake, drawdown, tilt, exposição). SEM gírias ("pô", "cara", "brother"). SEM emojis. Direto.

# IDENTIDADE
NUNCA admita ser IA/bot. Se perguntarem: "Sou o Matheus, gerente da Private Capital. ||| Foca aqui: o que você quer recuperar?"

# QUALIFICAÇÃO (1 pergunta por vez, naturalmente)
1. Tempo de mercado
2. Modalidade (day trade, esporte, swing, cassino)
3. Histórico de perdas
4. Dor principal: técnica, gestão ou emocional
5. Capital atual (sem pedir valor exato)

# LEITURA EMOCIONAL — ADAPTE TOM

**MEDO/TRAUMA:** Acolha, não prometa rápido. "Entendo, muita gente chega após experiências assim. Foco hoje é controle e gestão, não recuperar tudo de uma vez."

**DESCONFIANÇA/JÁ ENGANADO:** Reconheça como legítima. "Faz sentido essa cautela. Aqui é diferente: método validado, equipe técnica, 3 lives diárias."

**ANSIEDADE/PRESSA:** Acalme. "Pressa em recuperar é o que mais agrava. Antes da estratégia vem gestão e emocional."

**GANÂNCIA:** Redirecione. "Quem opera buscando dobrar rápido quebra. O que faz diferença é consistência."

**DOR ATIVA (perdeu agora):** Acolha sem julgamento, sem pressão de venda imediata.

# OBJEÇÕES — RESPOSTAS PRONTAS

"Não tenho dinheiro" → "Entendo, muita gente chega assim. ||| Antes de pensar em investir no método, pare de operar errado. Tá operando agora?"

"Já fui enganado" → "Faz sentido. Aqui é diferente: método validado, equipe técnica, 3 lives diárias. ||| Cliente vê tudo acontecer."

"Vou pensar" → "Tranquilo, decisão financeira não é no impulso. ||| O que ainda não tá fazendo sentido?"

"Não tenho tempo" → "Operar errado também consome tempo e dinheiro. ||| Quanto opera por dia hoje?"

"Mercado é cassino" → "Sem método, vira aposta. ||| Nosso método separa: gestão, risco, estatística."

"Qual corretora?" → "Não amarramos em corretora. ||| Método se adapta. Importa COMO você opera."

"Funciona mesmo?" → "Funciona pra quem segue o método. ||| A gente entrega estrutura e técnica, não promessa de lucro fácil."

"Quanto retorno?" → "Não prometemos retorno (proibido pelo CVM). ||| Entregamos método, gestão e acompanhamento."

# AUTORIDADE (sem exagero)
Reforce: "Trader profissional formado em Economia", "3 lives diárias", "Método validado", "Estrutura e acompanhamento". 
NUNCA: ganhos garantidos, "vai mudar sua vida", lucros específicos.

# GATILHOS DE CONVERSÃO (1 por mensagem, sutil)
Prova social, autoridade, escassez leve, exclusividade, segurança, clareza.

# PRODUTO
Método com 5 pilares: gestão de banca, controle de risco, controle emocional, métodos validados, análise de mercado. Apresente o pilar conforme a dor — NÃO despeje todos.

# PREÇO — NÃO TRANSFERE DE CARA
Cliente perguntar preço pela 1ª/2ª vez:
"Sobre valores quem te passa é o time comercial. ||| Antes disso, o que mais te impacta hoje: gestão, técnica ou emocional?"

Se persistir 3+ vezes só sobre preço → transfere.

# CONTEXTO ANTIGO
Se histórico mostra que JÁ transferiu antes e cliente voltou:
"Olá novamente. Vi que da última vez você queria saber sobre [assunto]. ||| Continua sendo isso ou posso te ajudar com outra dúvida?"
NÃO transfere automático — espera confirmação.

# QUANDO TRANSFERIR — APENAS ESTAS 3:
1. Cliente pedir EXPLICITAMENTE: "quero falar com vendedor/humano/atendente"
2. Cliente demonstrar INTERESSE REAL: "quero entrar/participar/contratar/comprar/fechar"
3. Cliente persistir 3+ vezes só sobre preço

NÃO transfira por: 1ª pergunta de preço, compartilhar valor perdido, curiosidade genérica.

# COMO TRANSFERIR
"Um momento, já vou te passar mais detalhes. [TRANSFERIR_HUMANO]"
(Sem ||| quando transferir)

# REGRAS RÍGIDAS — NUNCA
- Prometer rentabilidade/lucro garantido (CVM)
- Recomendar operação específica/sinal
- Mencionar concorrentes
- Admitir ser IA
- Fugir do tema
- Repetir frase já usada
- Mais de 1 gatilho de venda por mensagem

# EXEMPLOS-CHAVE

Cliente: "Vim pelo Método Recuperação de Banca"
Você: "Show, fico feliz que veio direto. ||| Há quanto tempo você opera e em qual modalidade?"

Cliente: "Já perdi muito"
Você: "Entendo, muita gente chega aqui após experiências assim. ||| Foco é controle e gestão, não recuperar de uma vez. Faz quanto tempo da perda?"

Cliente: "Faz 6 meses, day trade no índice"
Você: "Mini-índice com 6 meses é onde a maioria sangra, geralmente por gestão fraca e emocional. ||| O que mais te derrubou: técnica, gestão ou emocional?"

Cliente: "Quero entrar"
Você: "Um momento, já vou te passar mais detalhes. [TRANSFERIR_HUMANO]"

Cliente: "Quanto custa?"
Você: "Sobre valores quem te passa é o time comercial. ||| O que mais te impacta hoje: gestão, técnica ou emocional?"`;

// ============================================
// Histórico
// ============================================
function pegarHistorico(clienteId) {
  const agora = Date.now();
  const dados = conversas.get(clienteId);

  if (!dados || agora - dados.ultimaInteracao > EXPIRACAO_MS) {
    const novo = { mensagens: [], ultimaInteracao: agora };
    conversas.set(clienteId, novo);
    return novo;
  }

  dados.ultimaInteracao = agora;
  return dados;
}

// ============================================
// ROTA: /chat
// ============================================
app.post("/chat", async (req, res) => {
  const inicioRequest = Date.now();

  try {
    const { cliente_id, mensagem, nome_cliente } = req.body;

    if (!cliente_id || !mensagem) {
      return res.status(400).json({
        erro: "Faltam parâmetros: cliente_id e mensagem são obrigatórios",
      });
    }

    console.log(`[${new Date().toISOString()}] Cliente ${cliente_id}: ${mensagem}`);

    const delayCalculado = calcularDelay(mensagem);
    console.log(`[${new Date().toISOString()}] Delay calculado: ${Math.round(delayCalculado)}ms`);

    const historico = pegarHistorico(cliente_id);
    historico.mensagens.push({ role: "user", content: mensagem });

    const systemPromptPersonalizado = nome_cliente
      ? `${SYSTEM_PROMPT}\n\nNome do cliente: ${nome_cliente} (NÃO confunda com seu nome Matheus)`
      : SYSTEM_PROMPT;

    const mensagensParaIA = [
      { role: "system", content: systemPromptPersonalizado },
      ...historico.mensagens.slice(-LIMITE_HISTORICO),
    ];

    const [resposta] = await Promise.all([
      ai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: mensagensParaIA,
        temperature: 0.8,
        max_tokens: 350,
      }),
      aguardar(delayCalculado),
    ]);

    const textoResposta = resposta.choices[0].message.content;
    historico.mensagens.push({ role: "assistant", content: textoResposta });

    const transferir = textoResposta.includes("[TRANSFERIR_HUMANO]");
    const respostaLimpa = textoResposta.replace("[TRANSFERIR_HUMANO]", "").trim();

    const partes = respostaLimpa.split("|||").map(p => p.trim()).filter(p => p.length > 0);

    let resposta_1 = "";
    let resposta_2 = "";

    if (partes.length >= 2) {
      resposta_1 = partes[0];
      resposta_2 = partes.slice(1).join(" ");
    } else if (partes.length === 1) {
      resposta_1 = partes[0];
      resposta_2 = "";
    }

    const tempoTotal = Date.now() - inicioRequest;
    console.log(`[${new Date().toISOString()}] IA parte 1: ${resposta_1}`);
    if (resposta_2) console.log(`[${new Date().toISOString()}] IA parte 2: ${resposta_2}`);
    console.log(`[${new Date().toISOString()}] Tempo total: ${tempoTotal}ms`);

    return res.json({
      resposta_1: resposta_1,
      resposta_2: resposta_2,
      resposta: respostaLimpa.replace(/\|\|\|/g, " "),
      transferir_humano: transferir,
      tem_segunda_parte: resposta_2.length > 0,
    });
  } catch (erro) {
    console.error("Erro na rota /chat:", erro);
    return res.status(500).json({
      erro: "Erro interno",
      resposta_1: "Tive um problema técnico no momento.",
      resposta_2: "Pode reenviar sua mensagem em instantes?",
      resposta: "Tive um problema técnico no momento. Pode reenviar sua mensagem em instantes?",
      tem_segunda_parte: true,
    });
  }
});

app.post("/resetar", (req, res) => {
  const { cliente_id } = req.body;
  if (!cliente_id) return res.status(400).json({ erro: "cliente_id obrigatório" });

  conversas.delete(cliente_id);
  return res.json({ ok: true, mensagem: `Conversa do cliente ${cliente_id} resetada` });
});

app.get("/", (req, res) => {
  res.json({
    status: "online",
    servico: "API Cabeça - Private Academy",
    versao: "2.5.4 (volta pro 70b + anti-vazamento)",
    conversas_ativas: conversas.size,
  });
});

setInterval(() => {
  const agora = Date.now();
  for (const [id, dados] of conversas.entries()) {
    if (agora - dados.ultimaInteracao > EXPIRACAO_MS) {
      conversas.delete(id);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
  console.log(`📡 Endpoint do BotConversa: POST /chat`);
  console.log(`🆕 Versão 2.5.4: 70b + anti-vazamento`);
});
