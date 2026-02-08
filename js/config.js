export const CONFIG = {
    GEMINI_API_KEY: "YOUR_GEMINI_API_KEY", // Backup
    GROQ_API_KEY: "YOUR_GROQ_API_KEY", // Primary
    FIREBASE: {
        apiKey: "AIzaSyB4qYF2TgJNjxJXKvwfppd7r7RU9ga3Brs",
        authDomain: "fitness-saas-val.firebaseapp.com",
        projectId: "fitness-saas-val",
        storageBucket: "fitness-saas-val.firebasestorage.app",
        messagingSenderId: "846296693771",
        appId: "1:846296693771:web:98641b5b2570dd28085b0e"
    },
    APP_ID: "fitness-saas-val"
};

// Tenta pegar a configuração injetada globalmente se existir
export function getFirebaseConfig() {
    return (typeof window.__firebase_config !== 'undefined')
        ? JSON.parse(window.__firebase_config)
        : CONFIG.FIREBASE;
}

export function getAppId() {
    return (typeof window.__app_id !== 'undefined')
        ? window.__app_id
        : CONFIG.APP_ID;
}
