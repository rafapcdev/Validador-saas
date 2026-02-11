"use client";

import { useChat } from "../hooks/useChat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { Card } from "@/components/ui/card";

export function ChatInterface() {
    const { messages, isTyping, sendMessage, error } = useChat();

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden h-[600px] lg:h-auto lg:min-h-[600px]">
            {/* Header added in page.tsx or here? Original had header inside the container. 
                 Let's add the specific header strip here.
             */}
            <div className="bg-white p-4 border-b border-slate-100 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                            <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">Consultor Sênior</p>
                        <p className="text-xs text-slate-500">Avaliação de Fit de Mercado</p>
                    </div>
                </div>
                {/* Re-add Reset button if needed later */}
            </div>

            <MessageList messages={messages} isTyping={isTyping} />

            {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-2 text-center">
                    {error}
                </div>
            )}

            <ChatInput onSend={sendMessage} disabled={isTyping} />
        </div>
    );
}
