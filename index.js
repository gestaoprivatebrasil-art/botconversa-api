// ============================================
// API "Cabeça" - IA pro BotConversa
// Modelo: Llama 3.3 70B (Groq Free Tier)
// ============================================

import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// ----- Cliente Groq (compatível com SDK da OpenAI) -----
const ai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// ----- Memória das conversas (por cliente) -----
// OBS: isso fica em memória RAM. Se a API reiniciar, esquece tudo.
// Pra produção séria, depois trocamos por Redis ou banco.
const conversas = new Map();

// Limite de mensagens guardadas por cliente (pra não estourar tokens)
const LIMITE_HISTORICO = 20;

// Tempo de expiração da conversa (30 min sem msg = reseta)
const EXPIRACAO_MS = 30 * 60 * 1000;

// ----- Personalidade da IA (PERSONALIZE AQUI!) -----
const SYSTEM_PROMPT = `Você é um(a) atendente especialista em vendas de produtos do mercado financeiro.

SEU PAPEL:
- Atender clientes com simpatia, profissionalismo e tom consultivo
- Tirar dúvidas sobre os produtos financeiros oferecidos
- Qualificar o lead: entender o perfil do cliente (objetivo, capital disponível, experiência)
- Conduzir a conversa pra fechamento da venda ou agendamento com um humano

REGRAS:
- Responda SEMPRE em português brasileiro
- Mensagens CURTAS (máx 3-4 linhas), pois é WhatsApp
- Nunca prometa rentabilidade garantida (é proibido pelo CVM)
- Se o cliente pedir pra falar com humano, responda: "Claro! Vou te transferir agora pra um especialista. [TRANSFERIR_HUMANO]"
- Se não souber algo, seja honesto e diga que vai verificar com a equipe
- Use emojis com moderação (1 por mensagem no máximo)

PRODUTOS QUE VOCÊ VENDE:
[PERSONALIZE AQUI: liste seus produtos, ex: mentorias, sinais, robôs trader, cursos, etc.]
- Exemplo: Mentoria de Day Trade - R$ 2.997 (12x R$ 297)
- Exemplo: Sala de Sinais VIP - R$ 197/mês
`;

// ============================================
// Função pra obter/criar histórico do cliente
// ============================================
function pegarHistorico(clienteId) {
  const agora = Date.now();
  const dados = conversas.get(clienteId);

  // Se não existe ou expirou, cria novo
  if (!dados || agora - dados.ultimaInteracao > EXPIRACAO_MS) {
    const novo = { mensagens: [], ultimaInteracao: agora };
    conversas.set(clienteId, novo);
    return novo;
  }

  dados.ultimaInteracao = agora;
  return dados;
}

// ============================================
// ROTA PRINCIPAL: /chat
// É essa URL que você cola no BotConversa
// ============================================
app.post("/chat", async (req, res) => {
  try {
    const { cliente_id, mensagem, nome_cliente } = req.body;

    // Validação básica
    if (!cliente_id || !mensagem) {
      return res.status(400).json({
        erro: "Faltam parâmetros: cliente_id e mensagem são obrigatórios",
      });
    }

    console.log(`[${new Date().toISOString()}] Cliente ${cliente_id}: ${mensagem}`);

    // Pega histórico do cliente
    const historico = pegarHistorico(cliente_id);

    // Adiciona mensagem do cliente ao histórico
    historico.mensagens.push({ role: "user", content: mensagem });

    // Monta o array que será enviado pra IA
    const systemPromptPersonalizado = nome_cliente
      ? `${SYSTEM_PROMPT}\n\nO nome do cliente é: ${nome_cliente}`
      : SYSTEM_PROMPT;

    const mensagensParaIA = [
      { role: "system", content: systemPromptPersonalizado },
      ...historico.mensagens.slice(-LIMITE_HISTORICO),
    ];

    // Chama a IA
    const resposta = await ai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: mensagensParaIA,
      temperature: 0.7,
      max_tokens: 500,
    });

    const textoResposta = resposta.choices[0].message.content;

    // Salva resposta no histórico
    historico.mensagens.push({ role: "assistant", content: textoResposta });

    // Detecta se a IA pediu transferência pra humano
    const transferir = textoResposta.includes("[TRANSFERIR_HUMANO]");
    const respostaLimpa = textoResposta.replace("[TRANSFERIR_HUMANO]", "").trim();

    console.log(`[${new Date().toISOString()}] IA: ${respostaLimpa}`);

    return res.json({
      resposta: respostaLimpa,
      transferir_humano: transferir,
    });
  } catch (erro) {
    console.error("Erro na rota /chat:", erro);
    return res.status(500).json({
      erro: "Erro interno",
      resposta:
        "Desculpe, tive um problema técnico. Pode tentar de novo em instantes? 🙏",
    });
  }
});

// ============================================
// ROTA: /resetar - apaga histórico de um cliente
// ============================================
app.post("/resetar", (req, res) => {
  const { cliente_id } = req.body;
  if (!cliente_id) return res.status(400).json({ erro: "cliente_id obrigatório" });

  conversas.delete(cliente_id);
  return res.json({ ok: true, mensagem: `Conversa do cliente ${cliente_id} resetada` });
});

// ============================================
// ROTA: /status - healthcheck pra ver se tá no ar
// ============================================
app.get("/", (req, res) => {
  res.json({
    status: "online",
    servico: "API Cabeça - BotConversa",
    conversas_ativas: conversas.size,
  });
});

// ============================================
// Limpeza periódica de conversas expiradas
// ============================================
setInterval(() => {
  const agora = Date.now();
  for (const [id, dados] of conversas.entries()) {
    if (agora - dados.ultimaInteracao > EXPIRACAO_MS) {
      conversas.delete(id);
    }
  }
}, 5 * 60 * 1000); // a cada 5 min

// ----- Inicia o servidor -----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
  console.log(`📡 Endpoint do BotConversa: POST /chat`);
});
