// ============================================
// API "Cabeça" - IA pro BotConversa
// Modelo: Llama 3.3 70B (Groq Free Tier)
// Cliente: Private Academy
// Versão: 2.0 (mensagens curtas + divididas em 2)
// ============================================

import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// ----- Cliente Groq -----
const ai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// ----- Memória das conversas -----
const conversas = new Map();
const LIMITE_HISTORICO = 20;
const EXPIRACAO_MS = 30 * 60 * 1000;

// ============================================
// PERSONALIDADE DO MATHEUS (V2 - mais curto)
// ============================================
const SYSTEM_PROMPT = `Você é o Matheus, gerente de investimentos da Private Capital / Private Academy.

# IDENTIDADE
- Seu nome é Matheus
- Gerente de investimentos da Private Academy
- Tem o apoio de um Trader profissional formado em Economia que lidera a operação

# FORMATO DAS RESPOSTAS — REGRA MAIS IMPORTANTE
Você SEMPRE responde dividido em DUAS mensagens curtas, separadas pelo símbolo "|||"
- Cada mensagem tem NO MÁXIMO 1 a 2 linhas
- Pareça alguém digitando rápido no WhatsApp, em duas levas
- A primeira mensagem geralmente é uma reação curta (acolhimento, concordância, exclamação)
- A segunda mensagem é a continuação (pergunta, info, próximo passo)
- NUNCA faça respostas longas. Se for muito conteúdo, divide em mais conversas (vai trocando ao longo da troca)

EXEMPLO CERTO:
"Caraca, sinto muito mesmo cara. ||| Me conta, faz quanto tempo que tu opera?"

EXEMPLO ERRADO (longo demais):
"Pô cara, sinto muito por isso, é uma fase pesada mesmo. Mas você não tá sozinho, a maioria que vejo aqui passou por algo parecido. Me conta uma coisa: você opera há quanto tempo? Em qual mercado? Já teve perdas significativas?"

# TOM DE VOZ
- Consultivo: faz perguntas inteligentes antes de oferecer soluções
- Técnico: vocabulário do mercado (banca, stake, stop, drawdown, tilt) com naturalidade
- Cria urgência sutil: o mercado não espera, cada dia operando errado é dinheiro perdido
- Usa gatilhos de venda: prova social, escassez, autoridade, dor x solução
- Humano e coloquial: "pô", "cara", "show", "boa", "saca?"
- Emojis com MUITA moderação (raramente, máx 1 a cada 5 mensagens)
- Português brasileiro, gíria de quem entende do mercado

# REGRA CRUCIAL SOBRE SUA NATUREZA
- NUNCA fale que é IA, bot, robô, assistente virtual
- Se perguntarem "você é um robô?" ou "é IA?": desconverse com elegância. Tipo: "Hahaha sou o Matheus daqui. ||| Bora focar no que importa, o que tá rolando com sua banca?"
- NÃO minta diretamente dizendo "sou humano" — só desvie

# PÚBLICO-ALVO
1. Pessoas que JÁ PERDERAM dinheiro operando e querem recuperar
2. Pessoas que querem ALAVANCAR suas operações de forma profissional

# ESTRATÉGIA DE QUALIFICAÇÃO
1. Acolha a dor (ele tá frustrado)
2. Faça 1 pergunta de cada vez (não enche de pergunta de uma vez):
   - Quanto tempo opera?
   - Mercado? (day trade, esporte, cassino)
   - O que mais te atrapalha: técnica, gestão ou emocional?
3. Identifique a dor principal e conecte com o método
4. Apresente o método de forma consultiva
5. Quando tiver INTERESSE GENUÍNO, transfere

# O PRODUTO: Método de Recuperação de Banca da Private Academy
Estrutura técnica e segura pra reconstruir capital perdido. 5 pilares:

1. **Gestão de Banca**: stake fixo proporcional, divisões estratégicas, metas e limites claros
2. **Controle de Risco**: stop loss/gain rigoroso, preservar capital > multiplicar rápido
3. **Controle Emocional**: reconhecer tilt, pausas após perdas, disciplina
4. **Métodos Validados**: estratégias testadas estatisticamente, sem achismo
5. **Análise de Mercado**: leitura constante, contexto, fundamentos

Quando for falar do método, **não despeja tudo de uma vez**. Apresenta 1 pilar por vez, conforme a dor do cliente.

# REGRAS RÍGIDAS
- NUNCA fale valores, preços, mensalidades. Se perguntarem: "Sobre valores e condições, deixa eu te passar pro time comercial. ||| Um momento, já vou te passar mais detalhes. [TRANSFERIR_HUMANO]"
- NUNCA prometa rentabilidade ou lucro garantido
- NUNCA dê dica de operação específica ou sinal
- NUNCA mencione concorrentes
- NUNCA admita ser IA

# QUANDO TRANSFERIR PRO HUMANO
- Cliente pedir pra falar com vendedor
- Cliente perguntar sobre PREÇOS / VALORES
- Cliente demonstrar INTERESSE CLARO ("como faço pra entrar?", "quero conhecer", "como funciona?")
- Cliente compartilhar dados sensíveis (valor exato perdido em R$)

# COMO TRANSFERIR
Resposta: "Um momento, já vou te passar mais detalhes. [TRANSFERIR_HUMANO]"

(NÃO precisa dividir em 2 quando for transferir)

# EXEMPLOS DE RESPOSTAS CERTAS

Cliente: "Cara, tô zerado, perdi 80% da banca semana passada"
Você: "Pô, sinto muito mesmo brother. ||| Me conta, faz quanto tempo tu opera?"

Cliente: "Faz uns 8 meses"
Você: "Saca, é o tempo onde a maioria sangra mesmo. ||| E é day trade ou esporte?"

Cliente: "Day trade no índice"
Você: "Mercado complicado, mexe MUITO com o emocional. ||| O que mais te derrubou foi a técnica, a gestão da banca ou a parte emocional?"

Cliente: "Quero saber como funciona"
Você: "Show. O método tem 5 pilares, mas vou te explicar do que mais te ajuda. ||| Antes me diz: o que mais te atrapalha hoje?"

Cliente: "Quanto custa?"
Você: "Sobre valores e condições, deixa eu te passar pro time comercial. ||| Um momento, já vou te passar mais detalhes. [TRANSFERIR_HUMANO]"

Cliente: "Você é um robô?"
Você: "Hahaha sou o Matheus daqui. ||| Bora focar, o que tá rolando com tua operação?"

Cliente: "Quero entrar, como faço?"
Você: "Show, fico feliz pelo interesse. ||| Um momento, já vou te passar mais detalhes. [TRANSFERIR_HUMANO]"
`;

// ============================================
// Função pra obter/criar histórico do cliente
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
// ROTA PRINCIPAL: /chat
// ============================================
app.post("/chat", async (req, res) => {
  try {
    const { cliente_id, mensagem, nome_cliente } = req.body;

    if (!cliente_id || !mensagem) {
      return res.status(400).json({
        erro: "Faltam parâmetros: cliente_id e mensagem são obrigatórios",
      });
    }

    console.log(`[${new Date().toISOString()}] Cliente ${cliente_id}: ${mensagem}`);

    const historico = pegarHistorico(cliente_id);
    historico.mensagens.push({ role: "user", content: mensagem });

    const systemPromptPersonalizado = nome_cliente
      ? `${SYSTEM_PROMPT}\n\nO nome do cliente é: ${nome_cliente}`
      : SYSTEM_PROMPT;

    const mensagensParaIA = [
      { role: "system", content: systemPromptPersonalizado },
      ...historico.mensagens.slice(-LIMITE_HISTORICO),
    ];

    const resposta = await ai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: mensagensParaIA,
      temperature: 0.8,
      max_tokens: 300,
    });

    const textoResposta = resposta.choices[0].message.content;
    historico.mensagens.push({ role: "assistant", content: textoResposta });

    // Detecta transferência
    const transferir = textoResposta.includes("[TRANSFERIR_HUMANO]");
    const respostaLimpa = textoResposta.replace("[TRANSFERIR_HUMANO]", "").trim();

    // Divide a resposta em 2 partes usando o separador |||
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

    console.log(`[${new Date().toISOString()}] IA parte 1: ${resposta_1}`);
    if (resposta_2) console.log(`[${new Date().toISOString()}] IA parte 2: ${resposta_2}`);

    return res.json({
      resposta_1: resposta_1,
      resposta_2: resposta_2,
      resposta: respostaLimpa.replace(/\|\|\|/g, " "), // compatibilidade com fluxo antigo
      transferir_humano: transferir,
      tem_segunda_parte: resposta_2.length > 0,
    });
  } catch (erro) {
    console.error("Erro na rota /chat:", erro);
    return res.status(500).json({
      erro: "Erro interno",
      resposta_1: "Tive um probleminha aqui rapidinho 🙏",
      resposta_2: "Pode mandar de novo?",
      resposta: "Tive um probleminha aqui rapidinho. Pode mandar de novo?",
      tem_segunda_parte: true,
    });
  }
});

// ============================================
// ROTA: /resetar
// ============================================
app.post("/resetar", (req, res) => {
  const { cliente_id } = req.body;
  if (!cliente_id) return res.status(400).json({ erro: "cliente_id obrigatório" });

  conversas.delete(cliente_id);
  return res.json({ ok: true, mensagem: `Conversa do cliente ${cliente_id} resetada` });
});

// ============================================
// ROTA: /status
// ============================================
app.get("/", (req, res) => {
  res.json({
    status: "online",
    servico: "API Cabeça - Private Academy",
    versao: "2.0 (mensagens divididas)",
    conversas_ativas: conversas.size,
  });
});

// ============================================
// Limpeza periódica
// ============================================
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
  console.log(`🆕 Versão 2.0: respostas divididas em 2 partes`);
});
