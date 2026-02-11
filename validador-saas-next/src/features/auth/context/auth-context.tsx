"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { loginAnonymously, onAuthStateChanged } from "../lib/auth-service";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, error: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Subscribe to auth state
        const unsubscribe = onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);

            // If no user, try to login anonymously
            if (!currentUser) {
                setLoading(true);
                loginAnonymously()
                    .catch((err) => {
                        setError(err.message);
                        setLoading(false);
                    });
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, error }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
