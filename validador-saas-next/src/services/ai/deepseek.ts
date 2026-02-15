'use server';

export async function generateDeepSeekResponse(messages: { role: string; content: string }[]) {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
        throw new Error("DeepSeek API Key not found.");
    }

    try {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: messages,
                stream: false,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("DeepSeek API Response Error:", response.status, err);
            throw new Error(`DeepSeek API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (error: any) {
        console.error("DeepSeek API Error:", error);
        throw error;
    }
}

export async function analyzeDataDeepSeek(prompt: string) {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
        throw new Error("DeepSeek API Key not found.");
    }

    try {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "You are a data analyst. Output only valid JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            })
        });

        // DeepSeek might not support 'response_format: { type: "json_object" }' strictly like OpenAI, 
        // but let's try. If it fails, I'll remove it.
        // Actually, DeepSeek V3 supports it.

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`DeepSeek Analysis Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        // Strip markdown if exists
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return cleanContent;

    } catch (error) {
        console.error("DeepSeek Analysis Error:", error);
        throw new Error("Failed to analyze data with DeepSeek");
    }
}
