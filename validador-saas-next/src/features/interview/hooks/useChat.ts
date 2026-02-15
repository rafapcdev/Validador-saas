"use client";

import { useState, useEffect, useCallback } from "react";
import { Message, ChatState } from "../types";
import { useAuth } from "@/features/auth/context/auth-context";
import { db } from "@/shared/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, addDoc } from "firebase/firestore";
import { generateResponseOrchestrator } from "@/services/ai/orchestrator";
import { SYSTEM_PROMPT, } from "../lib/prompts";

// Combine prompts for the AI context
const FULL_SYSTEM_PROMPT = `${SYSTEM_PROMPT}`;

const INITIAL_MESSAGES: Message[] = [
    {
        role: "assistant",
        content: "Olá. Sou consultor especializado em tecnologia para o mercado fitness. Estamos conduzindo um estudo sobre gargalos operacionais.",
        timestamp: Date.now()
    },
    {
        role: "assistant",
        content: "Para iniciarmos o registro, qual é o seu nome, por favor?",
        timestamp: Date.now() + 100
    }
];

export function useChat() {
    const { user } = useAuth();
    const [state, setState] = useState<ChatState>({
        messages: [],
        isTyping: false,
        error: null
    });
    const [intervieweeName, setIntervieweeName] = useState<string | null>(null);
    const [chatId, setChatId] = useState<string | null>(null);

    // Initialize Session (Load or Create)
    useEffect(() => {
        if (!user) return;

        const initSession = async () => {
            // 1. Check Session Storage (DISABLED FOR TESTING)
            const storedChatId = null; // sessionStorage.getItem("current_interview_id");

            if (storedChatId) {
                // Resume existing session
                setChatId(storedChatId);
                await loadHistory(storedChatId);
            } else {
                // Start NEW session
                // We don't create the doc immediately to avoid empty docs if user bounces?
                // But we need an ID to save to session storage.
                // Let's create a logic: Generate ID, save to storage. Doc is created on first message?
                // No, easier to create doc now to ensure "connected" state.
                // Actually, let's just use `doc(collection(db, 'interviews'))` to generate an ID client side
                // or `addDoc` server side. 

                // Better: Generate a new Doc Ref ID.
                const newDocRef = doc(collection(db, "interviews"));
                const newId = newDocRef.id;

                // sessionStorage.setItem("current_interview_id", newId); // DISABLED FOR TESTING
                setChatId(newId);

                // Initialize State with Greeting
                setState(prev => ({ ...prev, messages: INITIAL_MESSAGES }));

                // We do NOT save to DB yet. We wait for user input (Name). 
                // This prevents spamming DB with empty sessions.
            }
        };

        const loadHistory = async (id: string) => {
            try {
                const docRef = doc(db, "interviews", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.intervieweeName) setIntervieweeName(data.intervieweeName);
                    if (data.messages) setState(prev => ({ ...prev, messages: data.messages }));
                } else {
                    // ID exists in storage but not DB? (Maybe deleted) -> Start fresh
                    setState(prev => ({ ...prev, messages: INITIAL_MESSAGES }));
                }
            } catch (err) {
                console.error("Error loading history:", err);
            }
        };

        initSession();
    }, [user]);

    const handleSendMessage = useCallback(async (content: string) => {
        if (!user || !chatId) return;

        // User Message
        const userMsg: Message = { role: "user", content, timestamp: Date.now() };

        // Optimistic UI
        setState(prev => ({
            ...prev,
            messages: [...prev.messages, userMsg],
            isTyping: true,
            error: null
        }));

        try {
            const docRef = doc(db, "interviews", chatId);
            const docSnap = await getDoc(docRef);

            let visibleHistory = [...state.messages];
            let isFirstMessage = false;

            // HANDLE NAME CAPTURE
            if (!intervieweeName) {
                isFirstMessage = true;
                setIntervieweeName(content);

                // First save? Create the doc.
                if (!docSnap.exists()) {
                    await setDoc(docRef, {
                        messages: [...INITIAL_MESSAGES, userMsg],
                        userId: user.uid,
                        createdAt: Date.now(),
                        intervieweeName: content,
                        updatedAt: Date.now(),
                        status: "active"
                    });
                } else {
                    // Should not happen if we respect the logic, but handled.
                    await updateDoc(docRef, {
                        messages: arrayUnion(userMsg),
                        intervieweeName: content,
                        updatedAt: Date.now()
                    });
                }
            } else {
                // Normal flow
                if (!docSnap.exists()) {
                    // Can happen if user refreshed before first save? 
                    // No, if refreshed, messages are lost because we didn't save INITIAL.
                    // Wait, if we don't save INITIAL_MESSAGES to DB, and user refreshes, they lose the greeting?
                    // Yes. But `initSession` restores `INITIAL_MESSAGES`.
                    // So if they type now, we create doc.
                    await setDoc(docRef, {
                        messages: [...state.messages, userMsg], // Include history if it was in memory
                        userId: user.uid,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        status: "active"
                    });
                } else {
                    await updateDoc(docRef, { messages: arrayUnion(userMsg), updatedAt: Date.now() });
                }
            }

            const aiMessages = (isFirstMessage ? [
                { role: "system", content: FULL_SYSTEM_PROMPT },
                ...visibleHistory.map(m => ({ role: m.role as "system" | "user" | "assistant", content: m.content })),
                { role: "user", content: content },
            ] : [
                { role: "system", content: FULL_SYSTEM_PROMPT },
                ...visibleHistory.map(m => ({ role: m.role as "system" | "user" | "assistant", content: m.content })),
                { role: "user", content: content }
            ]) as { role: "system" | "user" | "assistant"; content: string }[];

            // Call AI
            const aiResponseContent = await generateResponseOrchestrator(aiMessages);
            const aiMsg: Message = { role: "assistant", content: aiResponseContent, timestamp: Date.now() };

            // Save AI
            await updateDoc(docRef, { messages: arrayUnion(aiMsg) });

            setState(prev => ({
                ...prev,
                messages: [...prev.messages, aiMsg],
                isTyping: false
            }));

        } catch (err: any) {
            console.error("Chat Error:", err);
            setState(prev => ({ ...prev, isTyping: false, error: "Failed to send message." }));
        }
    }, [user, state.messages, intervieweeName, chatId]);

    return {
        messages: state.messages,
        isTyping: state.isTyping,
        sendMessage: handleSendMessage,
        error: state.error
    };
}
