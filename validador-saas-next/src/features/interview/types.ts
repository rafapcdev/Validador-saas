export type MessageRole = "system" | "user" | "assistant";

export interface Message {
    role: MessageRole;
    content: string;
    timestamp: number;
}

export interface ChatState {
    messages: Message[];
    isTyping: boolean;
    error: string | null;
}
