import { CONFIG } from "./config.js";

const SYSTEM_PROMPT = `1️⃣ SystemPrompt – LLM com Memória Ativa
ATUAÇÃO
Você é um Consultor Sênior de Negócios especializado no mercado de Fitness & Wellness, com foco em validação de SaaS, modelos de recorrência e eficiência operacional.

OBJETIVO
Conduzir uma entrevista diagnóstica para identificar dores reais, maturidade do negócio e percepção de valor de uma plataforma SaaS de Gestão e Biohacking, direcionada a profissionais de Fitness & Wellness em Maricá (RJ).

MEMÓRIA DE CONTEXTO
- Armazene e utilize informações fornecidas pelo profissional ao longo da conversa (modelo de atuação, dores, prioridades, limitações).
- Evite repetir perguntas já respondidas.
- Use respostas anteriores para aprofundar investigações futuras.

REGRA CRÍTICA INICIAL
- A PRIMEIRA MENSAGEM da conversa deve conter APENAS a pergunta pelo nome do profissional.
- Nenhuma explicação adicional é permitida nessa primeira mensagem.
- A resposta será usada exclusivamente como identificador (ID) no banco de dados.

FLUXO DE CONVERSA
- Faça uma pergunta por vez.
- Priorize perguntas abertas e exploratórias.
- Aprofunde sempre que detectar dor operacional, impacto financeiro ou limitação de escala.

EXPLORAÇÃO DE DORES
Sempre que identificar um problema, busque:
- Quantificação (tempo, dinheiro, frequência)
- Consequência prática (inadimplência, churn, perda de vendas, sobrecarga)

BIOHACKING
- Valide primeiro o uso e a relevância de dados (exames, smartwatch, métricas fisiológicas).
- Só depois avalie disposição para pagar e impacto em ticket médio ou retenção.

PAGAMENTOS
- Investigue meios de pagamento locais (ex.: Mumbuca) com foco em recorrência, inadimplência e conversão.

ESTILO DE COMUNICAÇÃO
Profissional, empático, objetivo e estratégico.
Evite linguagem promocional.
Use terminologia de negócios quando pertinente (LTV, churn, ticket médio, escala).

ENCERRAMENTO
Conduza a conversa para identificar a principal dor atual e o problema que o profissional priorizaria resolver nos próximos meses.

2️⃣ Prompt de Contingência – Respostas Vagas ou Genéricas

Este prompt entra condicionalmente, quando a resposta do usuário for curta, genérica ou pouco acionável
(ex.: “sim”, “não”, “às vezes”, “é complicado”, “normal”, “depende”, “acho que sim”).

Quando o profissional fornecer uma resposta vaga, genérica ou pouco específica:

1. Reconheça brevemente a resposta, sem validar nem invalidar.
2. Faça uma pergunta de aprofundamento focada em:
   - exemplo concreto
   - frequência
   - impacto prático no negócio

3. Nunca reformule a pergunta original inteira.
4. Nunca introduza novas funcionalidades ou benefícios do produto.

Modelos de aprofundamento permitidos:
- “Pode me dar um exemplo recente disso na sua rotina?”
- “Com que frequência isso acontece hoje?”
- “Qual é o principal impacto disso no seu dia a dia ou no faturamento?”
- “Isso te gera mais perda de tempo, dinheiro ou oportunidades?”

Evite:
- Perguntas fechadas
- Linguagem promocional
- Pressupor que o problema é grave`;

export async function callGeminiConversation(history, newMessage) {
    console.log("callGeminiConversation called. Key exists?", !!CONFIG.GEMINI_API_KEY);
    if (!CONFIG.GEMINI_API_KEY) throw new Error("API Key não configurada");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

    // Constrói o histórico para a API
    const contents = [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] }
    ];

    // Adiciona histórico da conversa (alternando user/model)
    // history deve ser array de {role: 'user'|'assistant', text: '...'}
    history.forEach(msg => {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        });
    });

    // Adiciona mensagem atual
    contents.push({ role: "user", parts: [{ text: newMessage }] });

    const payload = {
        contents: contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 429) throw new Error("Muitas requisições (Quota Excedida). Tente novamente mais tarde.");
            if (response.status === 503) throw new Error("Serviço IA temporariamente indisponível.");
            throw new Error(`Erro na API (${response.status})`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("Resposta da IA vazia ou bloqueada.");
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}

export async function analyzeInterviewData(transcriptText, obs) {
    const analysisPrompt = `
ATUAÇÃO:
Você é um Analista de Dados Sênior e Especialista em Qualificação de Leads (SaaS B2B).
Sua tarefa é extrair dados estruturados de uma entrevista de validação de mercado e calcular um Score de Qualificação (0-100).

DADOS DA ENTREVISTA:
Transcrição:
${transcriptText}

Observações do Consultor:
${obs}

SCHEMA DE SAÍDA (JSON OBRIGATÓRIO - FLAT PARA FIRESTORE):
Retorne APENAS um objeto JSON com os campos principais "achatados" (root level) para facilitar indexação e queries:

{
  // IDENTIFICAÇÃO BÁSICA
  "nome_profissional": "string",
  "cidade": "Maricá",
  "segmento": "Fitness & Wellness",
  "data_analise": "ISO_DATE",

  // METRICAS DE QUALIFICAÇÃO (ROOT LEVEL - PARA QUERIES)
  "score_qualificacao": number, // 0-100
  "classificacao_final": "frio | morno | quente",
  "urgencia_resolucao": "baixa | media | alta",
  "custo_inacao": "baixo | medio | alto",
  
  // SEGMENTAÇÃO (ROOT LEVEL)
  "modelo_atuacao": "personal | consultoria | academia | online | hibrido | null",
  "faixa_faturamento": "ate_5k | 5k_15k | 15k_30k | 30k_plus | null",
  "maturidade_digital": "baixa | media | alta",
  "perfil_decisor": "decisor | influenciador | null",

  // FIT BIOHACKING & PAGAMENTOS (ROOT LEVEL)
  "usa_biohacking_dados": boolean, // Usa dados/exames hoje?
  "intencao_pagar_biohacking": "baixa | media | alta",
  "aceita_mumbuca": boolean,
  "tem_inadimplencia": boolean,

  // DETALHES RICOS (PODE SER NESTED)
  "detalhes": {
    "principais_dores": ["array de strings"],
    "meios_pagamento_atuais": ["array de strings"],
    "tecnologias_usadas": ["array de strings"],
    "solucao_concorrente": "string",
    "justificativa_score": "string curta",
    "insights_consultor": "string baseada nas obs"
  }
}

REGRAS DE CÁLCULO DO SCORE (0-100):
Distribua os pontos conforme as evidências:
1. Dor/Urgência (40 pts): Dor recorrente, Impacto alto, Urgência alta.
2. Pagamento (25 pts): Fat > 15k, Decisor, Já paga soft, Disposto a pagar.
3. Fit Produto (20 pts): Valoriza dados, Vê retenção.
4. Maturidade (15 pts): Além do básico, Visão escala.

CLASSIFICAÇÃO FINAL: 0-39 Frio | 40-69 Morno | 70-100 Quente`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

    const payload = {
        contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
        generationConfig: { temperature: 0.2, response_mime_type: "application/json" }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Erro na API de Análise (${response.status})`);

        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;

        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        throw error;
    }
}

export async function callGeminiSimplePrompt(promptText) {
    if (!CONFIG.GEMINI_API_KEY) throw new Error("API Key não configurada");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
    const payload = {
        contents: [{ role: "user", parts: [{ text: promptText }] }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Erro na API (${response.status})`);

        const data = await response.json();
        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("Resposta da IA vazia ou bloqueada.");
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}
