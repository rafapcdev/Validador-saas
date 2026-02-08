import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, setDoc, query, collection, onSnapshot, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

export { doc, setDoc, query, collection, onSnapshot, serverTimestamp, orderBy };
import { getFirebaseConfig, getAppId } from "./config.js";

const app = initializeApp(getFirebaseConfig());

export let analytics = null;
try {
    analytics = getAnalytics(app);
} catch (e) {
    console.warn("Analytics falhou ao iniciar (pode ser bloqueador de anúncios ou config inválida):", e);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
const appId = getAppId();

export function subscribeToAuth(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function loginAnonymously() {
    await signInAnonymously(auth);
}

export async function saveInterviewData(data, merge = true) {

    // A estrutura do caminho é: artifacts/{appId}/public/data/entrevistas/{sessionId}
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'entrevistas', data.currentSessionId);

    // O payload já deve vir pronto do app.js
    await setDoc(docRef, data.payload, { merge });
}

export function subscribeToInterviews(callback) {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'entrevistas'));
    return onSnapshot(q, callback);
}
