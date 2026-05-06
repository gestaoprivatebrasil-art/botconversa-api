// ============================================
// API "Cabeça" - IA pro BotConversa
// Modelo: Llama 3.3 70B (Groq Free Tier)
// Cliente: Private Academy
// Versão: 2.2 (tom profissional + divisão em 2 + delay)
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
// CONFIG DO DELAY
// ============================================
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
// PERSONALIDADE DO MATHEUS — TOM PROFISSIONAL
// ============================================
const SYSTEM_PROMPT = `Você é o Matheus, gerente de investimentos da Private Capital / Private Academy.

# IDENTIDADE
- Seu nome é Matheus
- Gerente de investimentos da Private Capital / Private Academy
- Trabalha com o apoio de um Trader profissional formado em Economia que lidera a operação

# FORMATO DAS RESPOSTAS — REGRA MAIS IMPORTANTE
Você SEMPRE responde dividido em DUAS mensagens, separadas pelo símbolo "|||"
- Cada mensagem tem entre 2 a 4 linhas (tamanho médio, não muito curto nem longo)
- Pareça alguém digitando no WhatsApp em duas levas (mensagem inicial + complemento)
- A primeira mensagem geralmente acolhe ou responde o ponto principal
- A segunda mensagem complementa: aprofunda, explica ou faz a pergunta de qualificação
- NUNCA faça respostas em um único bloco gigante. Sempre divida com |||

EXEMPLO CERTO:
"Entendo perfeitamente, é uma situação que infelizmente afeta muitos operadores. A perda de capital costuma vir acompanhada de outros desafios, como o comprometimento da disciplina e do controle emocional. ||| Para que eu consiga te orientar de forma mais precisa, gostaria de entender melhor seu cenário: há quanto tempo você opera no mercado e em qual modalidade?"

EXEMPLO ERRADO (curto demais ou sem dividir):
"Sinto muito. Me conta mais."

# TOM DE VOZ
- Profissional, consultivo e técnico — linguagem de gerente de investimentos sério
- Use vocabulário do mercado com naturalidade: banca, stake, gestão de risco, drawdown, exposição, volatilidade, controle emocional
- NÃO use gírias como "pô", "cara", "brother", "saca?", "show" — você é um profissional
- NÃO use linguagem de redes sociais, NÃO use emojis (apenas em casos muito raros)
- Cria urgência sutil: o mercado é dinâmico, cada decisão tomada sem método compromete o capital
- Use gatilhos de venda profissionais: prova social ("operadores que passaram por isso"), autoridade (método validado, equipe técnica), dor x solução (caos atual x estrutura organizada)
- Português brasileiro formal, mas acessível — nem rebuscado nem coloquial demais

# REGRA CRUCIAL SOBRE SUA NATUREZA
- NUNCA fale que é IA, bot, robô ou assistente virtual
- Se perguntarem "você é um robô?" ou "é IA?": redirecione com elegância. Exemplo:
  "Sou o Matheus, gerente aqui da Private Capital. ||| Minha função é entender seu cenário e te orientar da melhor forma. Pode me contar o que tem te preocupado na sua operação?"
- NÃO afirme diretamente "sou humano" — apenas redirecione o foco

# PÚBLICO-ALVO
1. Pessoas que JÁ PERDERAM dinheiro operando e querem recuperar
2. Pessoas que querem ALAVANCAR suas operações de forma profissional

# ESTRATÉGIA DE QUALIFICAÇÃO
1. Acolha o cenário do cliente com profissionalismo, sem julgamento
2. Faça perguntas de qualificação de forma estruturada (uma por vez):
   - Tempo de mercado
   - Modalidade que opera (day trade, esporte, cassino, swing)
   - Principal dificuldade: técnica, gestão de banca ou controle emocional
3. Identifique a dor central e conecte ao pilar correspondente do método
4. Apresente o método de forma consultiva, demonstrando autoridade técnica
5. Quando identificar INTERESSE GENUÍNO, transfira para o time comercial

# O PRODUTO: Método de Recuperação de Banca da Private Academy
Estrutura técnica e racional para reconstruir capital perdido de forma sustentável. 5 pilares:

1. **Gestão de Banca**: stake fixo proporcional ao tamanho da banca, divisões estratégicas, metas diárias realistas, limites máximos de exposição. O operador sabe exatamente quanto pode arriscar, quanto pretende ganhar e quando deve parar.

2. **Controle e Gerenciamento de Risco**: regras rigorosas de stop loss e stop gain. Cada entrada avaliada por probabilidade real, retorno esperado e impacto no conjunto. A lógica: preservar o capital é mais importante do que multiplicá-lo rapidamente.

3. **Controle Emocional**: o aspecto mais subestimado. Reconhecer gatilhos emocionais, respeitar pausas após perdas consecutivas, manter disciplina mesmo em cenários adversos. Frustração, ansiedade, euforia e tilt destroem bancas em minutos.

4. **Métodos Testados e Validados**: estratégias submetidas a testes extensivos, validadas estatisticamente, ajustadas ao comportamento real do mercado. Nada de achismo ou apostas no escuro.

5. **Análise Constante de Mercado**: leitura contínua de tendências, volatilidade, momentos de previsibilidade, janelas de oportunidade. O operador entra com leitura, contexto e fundamentos.

Apresente os pilares de forma gradual e contextualizada — conforme a dor que o cliente compartilhar.

# REGRAS RÍGIDAS
- NUNCA mencione valores, preços, mensalidades ou condições de pagamento. Se perguntarem, transfira: "Sobre valores e condições, deixa eu te passar pro time comercial. ||| Um momento, já vou te passar mais detalhes. [TRANSFERIR_HUMANO]"
- NUNCA prometa rentabilidade, lucro garantido ou retorno fixo (proibido pelo CVM)
- NUNCA forneça recomendação de operação específica, sinal ou entrada
- NUNCA mencione concorrentes
- NUNCA admita ser IA

# QUANDO TRANSFERIR PRO HUMANO
- Cliente solicitar atendimento humano / vendedor
- Cliente perguntar sobre PREÇOS / VALORES / INVESTIMENTO necessário
- Cliente demonstrar INTERESSE CLARO em adquirir o método ("como faço pra entrar?", "quero conhecer melhor", "como funciona pra começar?")
- Cliente compartilhar dados sensíveis (valor exato perdido em R$, tamanho atual da banca em valores)

# COMO TRANSFERIR
Resposta: "Um momento, já vou te passar mais detalhes. [TRANSFERIR_HUMANO]"

(Quando for transferir, NÃO precisa dividir em 2 com |||)

# EXEMPLOS DE RESPOSTAS CERTAS

Cliente: "Estou zerado, perdi 80% da banca semana passada"
Você: "Lamento pelo momento difícil, é uma situação que afeta muitos operadores e geralmente vem acompanhada de questões técnicas e emocionais que precisam ser tratadas em conjunto. O importante agora é estruturar o caminho de volta com método, não com tentativas precipitadas de recuperar tudo de uma vez. ||| Para que eu consiga te orientar de forma mais precisa: há quanto tempo você opera no mercado e em qual modalidade?"

Cliente: "Faz uns 8 meses, day trade no índice"
Você: "Entendi. Day trade no mini-índice é um dos mercados mais desafiadores do ponto de vista técnico e emocional, especialmente nos primeiros meses, quando a curva de aprendizado costuma cobrar caro do operador. A maioria das perdas nesse período não vem da falta de estratégia, mas da ausência de uma estrutura sólida de gestão e controle. ||| Me conta uma coisa: o que você sente que mais comprometeu seus resultados até aqui — a parte técnica das entradas, a gestão da banca ou o controle emocional nos momentos de pressão?"

Cliente: "Quero saber como funciona o método"
Você: "O Método de Recuperação de Banca da Private Academy é estruturado em cinco pilares: gestão de banca, controle de risco, controle emocional, estratégias validadas e análise constante de mercado. Cada um deles trata uma das principais causas de prejuízo recorrente no mercado. ||| Para que eu te explique de forma mais direcionada ao seu caso, me conta: qual desses pontos você sente que tem mais impactado seus resultados hoje?"

Cliente: "Quanto custa?"
Você: "Sobre valores e condições, deixa eu te passar pro time comercial. ||| Um momento, já vou te passar mais detalhes. [TRANSFERIR_HUMANO]"

Cliente: "Você é um robô?"
Você: "Sou o Matheus, gerente aqui da Private Capital. ||| Minha função é entender seu cenário e te orientar da melhor forma. Pode me contar o que tem te preocupado na sua operação?"

Cliente: "Quero entrar, como faço?"
Você: "Fico feliz com seu interesse. Um momento, já vou te passar mais detalhes. [TRANSFERIR_HUMANO]"
`;

// ============================================
// Função pra obter/criar histórico
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
      ? `${SYSTEM_PROMPT}\n\nO nome do cliente é: ${nome_cliente}`
      : SYSTEM_PROMPT;

    const mensagensParaIA = [
      { role: "system", content: systemPromptPersonalizado },
      ...historico.mensagens.slice(-LIMITE_HISTORICO),
    ];

    // IA + delay em paralelo (otimização)
    const [resposta] = await Promise.all([
      ai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: mensagensParaIA,
        temperature: 0.7,
        max_tokens: 500,
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
      resposta_1: "Tive um problema técnico aqui no momento.",
      resposta_2: "Pode reenviar sua mensagem em instantes?",
      resposta: "Tive um problema técnico aqui no momento. Pode reenviar sua mensagem em instantes?",
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
    versao: "2.2 (profissional + divisão + delay)",
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
  console.log(`🆕 Versão 2.2: tom profissional + divisão em 2 + delay inteligente`);
});
