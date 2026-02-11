'use server';

import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function generateAIResponse(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
    try {
        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
        });

        return completion.choices[0]?.message?.content || "";
    } catch (error: any) {
        console.error("Groq API Error:", error);
        throw error;
    }
}

export async function analyzeData(prompt: string) {
    // The prompt passed here is ALREADY the full Analysis Prompt from the caller (Orchestrator or Hook),
    // OR we should construct it here? 
    // The legacy code passed `transcriptText` and `obs` to `analyzeInterviewData` which BUILT the prompt.
    // My previous implementation expected `prompt` to be the full text.
    // Let's keep it flexible: The caller constructs the prompt.
    // BUT the legacy code had a SPECIFIC valid-json-only prompt. 
    // Let's assume the caller uses the `ANALYSIS_PROMPT` template.

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a data analyst. Output only valid JSON." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        return completion.choices[0]?.message?.content || "{}";
    } catch (error) {
        console.error("Groq Analysis Error:", error);
        throw new Error("Failed to analyze data");
    }
}
