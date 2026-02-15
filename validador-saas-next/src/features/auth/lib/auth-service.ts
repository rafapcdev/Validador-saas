import { signInAnonymously, User } from "firebase/auth";
import { auth } from "@/shared/lib/firebase";

export async function loginAnonymously(): Promise<User> {
    try {
        const result = await signInAnonymously(auth);
        return result.user;
    } catch (error: any) {
        console.error("Anonymous Auth Error:", error);
        throw new Error("Failed to authenticate anonymously. Please check Firebase Console configuration.");
    }
}

export function onAuthStateChanged(callback: (user: User | null) => void) {
    return auth.onAuthStateChanged(callback);
}
