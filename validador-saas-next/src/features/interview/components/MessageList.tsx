import { useRef, useEffect } from "react";
import { Message } from "../types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User } from "lucide-react";

interface MessageListProps {
    messages: Message[];
    isTyping: boolean;
}

export function MessageList({ messages, isTyping }: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages, isTyping]);


    return (
        <ScrollArea className="flex-1 p-4 h-full" ref={scrollRef}>
            <div className="flex flex-col gap-4 pb-4">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex mb-4",
                            msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                    >
                        {/* Removed Avatar for User to match original simple look, or keep it if better? 
                             Original had no avatar for user, just bubble. 
                             Assistant had avatar in header, but not in bubble?
                             Let's check index.html: 
                             lines 45-60: addMessageToUI
                             isUser: 'justify-end', black bubble, rounded-2xl rounded-tr-sm
                             Bot: 'justify-start', white bubble, border, rounded-2xl rounded-tl-sm
                             No avatars in the message list flow in original.
                         */}

                        <div
                            className={cn(
                                "px-5 py-3 shadow-sm max-w-[85%] text-sm leading-relaxed",
                                msg.role === "user"
                                    ? "bg-slate-900 text-white rounded-2xl rounded-tr-sm"
                                    : "bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm"
                            )}
                        >
                            {msg.content.split('\n').map((line, i) => (
                                <span key={i}>
                                    {line}
                                    {i < msg.content.split('\n').length - 1 && <br />}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start mb-4">
                        <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}
