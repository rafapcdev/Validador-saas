'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateGeminiResponse(messages: { role: string; content: string }[]) {
    try {
        // Reverted to stable model
        // Reverted to stable model (Flash is valid, 002 was 404)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Convert OpenAI format to Gemini format
        // System prompt is separate in Gemini
        const systemMessage = messages.find(m => m.role === "system");

        let chat;
        const historyParts = messages
            .filter(m => m.role !== "system")
            .map(m => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }]
            }));

        // Gemini enforces that history MUST start with 'user'.
        // If the chat history starts with 'model' (assistant greeting), we inject a dummy user message.
        if (historyParts.length > 0 && historyParts[0].role === "model") {
            historyParts.unshift({
                role: "user",
                parts: [{ text: "Início da conversa." }]
            });
        }

        // Bulletproof Strategy: Move System Prompt to History (First User Message)
        if (systemMessage) {
            historyParts.unshift({
                role: "user",
                parts: [{ text: `INSTRUÇÕES DE SISTEMA:\n${systemMessage.content}\n\n---\n` }]
            });
            historyParts.splice(1, 0, {
                role: "model",
                parts: [{ text: "Entendido. Seguirei essas instruções." }]
            });
        }

        chat = model.startChat({
            history: historyParts
        });

        const lastMsg = messages[messages.length - 1]; // Wait, we usually pass history + new msg. 
        // But the Orchestrator passes ALL messages including the last one.
        // Google Generative AI 'startChat' history typically excludes the very last message which is sent via sendMessage.
        // However, looking at my `orchestrator.ts`, it constructs the full array.
        // If I pass the full array as history, I have nothing to "send".
        // Let's pop the last user message.

        const validHistory = historyParts.slice(0, -1);
        const lastUserMsg = historyParts[historyParts.length - 1];

        if (!lastUserMsg || lastUserMsg.role !== 'user') {
            // If the last message isn't user (rare), just send empty? Or maybe we are just prompting.
            // Actually if we are just starting, history might be empty.
            return "";
        }

        // Re-init chat with correct history slicing
        // Bulletproof Strategy: Move System Prompt to History (First User Message)
        // This avoids 400/404 errors with systemInstruction parameter versions
        if (systemMessage) {
            validHistory.unshift({
                role: "user",
                parts: [{ text: `INSTRUÇÕES DE SISTEMA:\n${systemMessage.content}\n\n---\n` }]
            });
            // Add a dummy model acknowledgement to keep 'user-model' turn order
            validHistory.splice(1, 0, {
                role: "model",
                parts: [{ text: "Entendido. Seguirei essas instruções." }]
            });
        }

        chat = model.startChat({
            history: validHistory
        });

        const result = await chat.sendMessage(lastUserMsg.parts[0].text);
        return result.response.text();
    } catch (error: any) {
        console.warn("Gemini API Error:", error);
        throw error;
    }
}
