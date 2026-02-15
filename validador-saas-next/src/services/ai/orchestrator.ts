'use server';

import { generateGeminiResponse } from "./gemini";
import { generateAIResponse as generateGroqResponse, analyzeData } from "./groq";
import { generateDeepSeekResponse, analyzeDataDeepSeek } from "./deepseek";
import { generateOpenRouterResponse, analyzeDataOpenRouter } from "./openrouter";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateResponseOrchestrator(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
    // 1. Try Gemini (Primary - Free & Fast)
    try {
        return await generateGeminiResponse(messages);
    } catch (geminiError: any) {
        console.warn("⚠️ Gemini Failed. Switching to Groq fallback.", geminiError.message);

        // 2. Fallback to Groq (Llama 3)
        try {
            return await generateGroqResponse(messages);
        } catch (groqError: any) {
            console.warn("⚠️ Groq Failed. Switching to DeepSeek fallback.", groqError.message);

            // 3. Fallback to DeepSeek
            try {
                return await generateDeepSeekResponse(messages);
            } catch (deepseekError: any) {
                console.warn("⚠️ DeepSeek Failed. Switching to OpenRouter fallback.", deepseekError.message);

                // 4. Fallback to OpenRouter
                try {
                    return await generateOpenRouterResponse(messages);
                } catch (openRouterError: any) {
                    console.error("❌ All AI services failed.");
                    console.error("DeepSeek Error:", deepseekError.message);
                    console.error("OpenRouter Error:", openRouterError.message);
                    throw new Error(`AI Service Unavailable: Gemini (${geminiError.message}) | Groq (${groqError.message}) | DeepSeek (${deepseekError.message}) | OpenRouter (${openRouterError.message})`);
                }
            }
        }
    }
}

export async function analyzeDataOrchestrator(prompt: string) {
    // 1. Try Gemini (Primary)
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (geminiError) {
        console.warn("⚠️ Gemini Analysis Failed. Switching to Groq.", geminiError);

        // 2. Fallback to Groq
        try {
            return await analyzeData(prompt);
        } catch (groqError) {
            console.warn("⚠️ Groq Analysis Failed. Switching to DeepSeek.");

            // 3. Fallback to DeepSeek
            try {
                return await analyzeDataDeepSeek(prompt);
            } catch (deepseekError: any) {
                console.warn("⚠️ DeepSeek Analysis Failed. Switching to OpenRouter.");

                // 4. Fallback to OpenRouter
                try {
                    return await analyzeDataOpenRouter(prompt);
                } catch (openRouterError: any) {
                    console.error("❌ All AI services failed analysis.");
                    throw new Error("AI Analysis Unavailable");
                }
            }
        }
    }
}
