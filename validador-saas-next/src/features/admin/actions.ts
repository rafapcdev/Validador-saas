"use server";

import { db } from "@/shared/lib/firebase";
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import { analyzeDataOrchestrator } from "@/services/ai/orchestrator";

// Type definition for the Analysis Result
export interface AnalysisResult {
    score_qualificacao: number;
    classificacao_final: "frio" | "morno" | "quente";
    urgencia_resolucao: "baixa" | "media" | "alta";
    custo_inacao: "baixo" | "medio" | "alto";
    intencao_pagar_biohacking: "baixa" | "media" | "alta";
    detalhes: {
        principais_dores: string[];
        justificativa_score: string;
        insights_consultor: string;
    };
    nome_profissional?: string;
    cidade?: string;
    segmento?: string;
}

export async function getInterviews() {
    try {
        const q = query(collection(db, "interviews"), orderBy("createdAt", "desc"), limit(50));
        const querySnapshot = await getDocs(q);

        const interviews = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return { success: true, data: interviews };
    } catch (error: any) {
        console.error("Error fetching interviews:", error);
        return { success: false, error: error.message };
    }
}

export async function analyzeInterview(id: string, history: any[], intervieweeName: string) {
    try {
        if (!history || history.length === 0) {
            throw new Error("No history to analyze");
        }

        // Format transcript
        const transcript = history.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

        const PROMPT = `
ATUAÇÃO:
Você é um Analista de Dados Sênior e Especialista em Qualificação de Leads (SaaS B2B).
Sua tarefa é extrair dados estruturados de uma entrevista de validação de mercado e calcular um Score de Qualificação (0-100).

DADOS DA ENTREVISTA:
Nome do Lead: ${intervieweeName || "Desconhecido"}
Transcrição:
${transcript}

SCHEMA DE SAÍDA (JSON OBRIGATÓRIO):
Retorne APENAS um objeto JSON válido. Não inclua markdown.
{
  "nome_profissional": "string",
  "cidade": "string (inferir ou 'Não informado')",
  "segmento": "Fitness & Wellness",
  "score_qualificacao": 0, 
  "classificacao_final": "frio | morno | quente",
  "urgencia_resolucao": "baixa | media | alta",
  "custo_inacao": "baixo | medio | alto",
  "intencao_pagar_biohacking": "baixa | media | alta",
  "detalhes": {
    "principais_dores": ["Lista de 1 a 3 dores principais identificadas"],
    "justificativa_score": "Explicação breve do motivo da nota",
    "insights_consultor": "Uma observação estratégica sobre este lead"
  }
}

REGRAS DE CÁLCULO DO SCORE (0-100):
1. Dor Latente (40 pts): O lead expressou dor clara e recorrente?
2. Fit da Solução (30 pts): A solução proposta (Gamificação/Gestão) resolve o problema dele?
3. Intenção de Compra (20 pts): Demonstrou interesse em pagar ou usar?
4. Perfil Decisor (10 pts): É dono ou tem autonomia?
`;

        const resultJsonRaw = await analyzeDataOrchestrator(PROMPT);

        // Sanitize JSON (remove markdown if AI adds it)
        const jsonString = resultJsonRaw.replace(/```json/g, "").replace(/```/g, "").trim();
        const result: AnalysisResult = JSON.parse(jsonString);

        // Update Firestore
        const docRef = doc(db, "interviews", id);
        await updateDoc(docRef, {
            ...result,
            analysisDate: Date.now(),
            status: "analyzed"
        });

        return { success: true, data: result };
    } catch (error: any) {
        console.error("Error analyzing interview:", error);
        return { success: false, error: error.message };
    }
}
