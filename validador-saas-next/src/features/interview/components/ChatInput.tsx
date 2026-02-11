import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendIcon, Loader2 } from "lucide-react";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [input, setInput] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || disabled) return;

        onSend(input);
        setInput("");
    };

    return (
        <div className="p-4 bg-white border-t border-slate-100">
            <form onSubmit={handleSubmit} className="flex gap-3 relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Digite aqui..."
                    disabled={disabled}
                    className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 p-4 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-sm font-medium placeholder:text-slate-400"
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={disabled || !input.trim()}
                    className="bg-slate-900 text-white w-14 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                </button>
            </form>
        </div>
    );
}
