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

/**
 * Helper para chamadas com retry e backoff exponencial.
 */
async function fetchWithRetry(url, options, retries = 3, backoff = 2000) {
    try {
        const response = await fetch(url, options);

        // Se der erro 429 (Rate Limit) ou 5xx (Server Error), tenta de novo
        if (response.status === 429 || response.status >= 500) {
            if (retries > 0) {
                console.warn(`Erro ${response.status}. Tentando novamente em ${backoff}ms... (Restam ${retries} tentativas)`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return fetchWithRetry(url, options, retries - 1, backoff * 2); // Exponencial
            }
        }

        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`Erro de rede: ${error.message}. Tentando novamente em ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

export async function callAIConversation(history, newMessage) {
    if (!CONFIG.GROQ_API_KEY) throw new Error("API Key Groq não configurada");

    const url = "https://api.groq.com/openai/v1/chat/completions";

    // Constrói mensagens no formato OpenAI/Groq
    const messages = [
        { role: "system", content: SYSTEM_PROMPT }
    ];

    history.forEach(msg => {
        messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant', // Groq usa 'assistant'
            content: msg.text
        });
    });

    messages.push({ role: "user", content: newMessage });

    const payload = {
        model: "llama-3.3-70b-versatile", // Modelo rápido e inteligente
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
    };

    try {
        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("Groq API Error Body:", errBody);
            throw new Error(`Erro na API Groq (${response.status})`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error("AI Service Error:", error);
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
Retorne APENAS um objeto JSON válido. Não inclua markdown \`\`\`json.
{
  "nome_profissional": "string",
  "cidade": "Maricá",
  "segmento": "Fitness & Wellness",
  "data_analise": "ISO_DATE",
  "score_qualificacao": number, 
  "classificacao_final": "frio | morno | quente",
  "urgencia_resolucao": "baixa | media | alta",
  "custo_inacao": "baixo | medio | alto",
  "modelo_atuacao": "personal | consultoria | academia | online | hibrido | null",
  "faixa_faturamento": "ate_5k | 5k_15k | 15k_30k | 30k_plus | null",
  "maturidade_digital": "baixa | media | alta",
  "perfil_decisor": "decisor | influenciador | null",
  "usa_biohacking_dados": boolean,
  "intencao_pagar_biohacking": "baixa | media | alta",
  "aceita_mumbuca": boolean,
  "tem_inadimplencia": boolean,
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

    if (!CONFIG.GROQ_API_KEY) throw new Error("API Key Groq não configurada");

    const url = "https://api.groq.com/openai/v1/chat/completions";

    const payload = {
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: "You are a data analyst. Output only valid JSON." },
            { role: "user", content: analysisPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" } // Groq suporta JSON mode
    };

    try {
        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("Groq Analysis Error Body:", errBody);
            throw new Error(`Erro na Análise Groq (${response.status})`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        return JSON.parse(content);

    } catch (error) {
        console.error("Analysis Error:", error);
        throw error;
    }
}

export async function callAISimplePrompt(promptText) {
    if (!CONFIG.GROQ_API_KEY) throw new Error("API Key Groq não configurada");

    const url = "https://api.groq.com/openai/v1/chat/completions";

    const payload = {
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "user", content: promptText }
        ],
        temperature: 0.7
    };

    try {
        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("Groq Simple Prompt Error Body:", errBody);
            throw new Error(`Erro na API Groq (${response.status})`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error("AI Service Error:", error);
        throw error;
    }
}