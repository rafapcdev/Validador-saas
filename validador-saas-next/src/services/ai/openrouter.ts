'use server';

export async function generateOpenRouterResponse(messages: { role: string; content: string }[]) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error("OpenRouter API Key not found.");
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://fitness-saas-validator.com", // Optional but encouraged
                "X-Title": "Fitness SaaS Validator"
            },
            body: JSON.stringify({
                // Using a cheap/free model or a reliable fallback like Llama 3 8B
                // Using a cheap/free model or a reliable fallback
                model: "meta-llama/llama-3.2-1b-instruct:free",
                messages: messages,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("OpenRouter API Response Error:", response.status, err);
            throw new Error(`OpenRouter API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (error: any) {
        console.error("OpenRouter API Error:", error);
        throw error;
    }
}

export async function analyzeDataOpenRouter(prompt: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error("OpenRouter API Key not found.");
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://fitness-saas-validator.com",
                "X-Title": "Fitness SaaS Validator"
            },
            body: JSON.stringify({
                model: "meta-llama/llama-3.2-1b-instruct:free",
                messages: [
                    { role: "system", content: "You are a data analyst. Output only valid JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenRouter Analysis Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        // Strip markdown if exists
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return cleanContent;

    } catch (error) {
        console.error("OpenRouter Analysis Error:", error);
        throw new Error("Failed to analyze data with OpenRouter");
    }
}
