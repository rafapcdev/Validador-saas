import { auth, loginAnonymously, subscribeToAuth, saveInterviewData, subscribeToInterviews, db, serverTimestamp, collection, onSnapshot, query, orderBy } from "./firebase-service.js";
import { callAIConversation, analyzeInterviewData, callAISimplePrompt } from "./ai-service.js";
// import { callGeminiConversation, analyzeInterviewData } from "./gemini-service.js"; // Deprecated
import { ELEMENTS, showToast, showTyping, removeTyping, addMessageToUI, resetChatUI, toggleModal } from "./ui-controller.js";
// import { serverTimestamp, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // REMOVED
// import { db } from "./firebase-service.js"; // Merged above
import { getAppId } from "./config.js";

// --- STATE ---
let currentState = {
    user: null,
    currentSessionId: crypto.randomUUID(),
    fullTranscript: [],
    intervieweeName: null,
    allInterviews: [],
    myChart: null,
    unsubscribeSnapshots: null
};

const appId = getAppId();

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // Auth Listener
    // Auth Listener
    subscribeToAuth((user) => {
        if (user) {
            currentState.user = user;
            console.log("User logged in:", user.uid);
            loadInterviews();
        } else {
            // Se não tem user do firebase, tenta logar
            loginAnonymously()
                .catch(e => {
                    showToast("ERRO CRÍTICO: Firebase Auth falhou. Ative o Auth Anônimo no Console.", "error");
                    console.error("Login Error:", e);
                    // Bloqueia a UI
                    document.getElementById('user-input').disabled = true;
                    document.getElementById('send-btn').disabled = true;
                    document.getElementById('initial-message').innerHTML += '<br><strong class="text-rose-500">❌ Erro: Banco de Dados Inacessível via Auth.</strong>';
                });
        }
    });

    // Ensure UI is ready
    resetChatUI();

    // Event Listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Chat Submit
    if (ELEMENTS.chatForm) {
        ELEMENTS.chatForm.addEventListener('submit', handleChatSubmit);
    }

    // Nav Buttons (Programmatic listeners)
    const btnChat = document.getElementById('tab-chat');
    const btnAdmin = document.getElementById('tab-admin');
    if (btnChat) btnChat.onclick = () => switchTab('chat');
    if (btnAdmin) btnAdmin.onclick = () => requestAdminAccess();

    // Modal Close Buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = (e) => toggleModal(e.target.closest('.fixed').id.replace('modal-', ''));
    });
    // Fallback for onclicks in HTML that might use closeModal('type')
    window.closeModal = toggleModal;

    // Buttons with data-modal-target
    document.querySelectorAll('[data-modal-target]').forEach(btn => {
        btn.onclick = () => toggleModal(btn.dataset.modalTarget);
    });

    // Specific Buttons
    const btnVerifyPass = document.querySelector('#modal-password button.bg-slate-900');
    if (btnVerifyPass) btnVerifyPass.onclick = verifyPassword;

    const btnCancelPass = document.querySelector('#modal-password button.text-slate-600');
    if (btnCancelPass) btnCancelPass.onclick = () => toggleModal('password');

    const btnFinishSave = document.querySelector('#modal-finish button.bg-slate-900');
    if (btnFinishSave) btnFinishSave.onclick = handleFinishSession;

    const btnAIInsight = document.getElementById('btn-ai-insight');
    if (btnAIInsight) btnAIInsight.onclick = generateAIInsights;

    // Password Enter Key
    const passInput = document.getElementById('admin-password');
    if (passInput) {
        passInput.onkeypress = (e) => {
            if (e.key === 'Enter') verifyPassword();
        };
    }
}

async function handleChatSubmit(e) {
    e.preventDefault();
    const msg = ELEMENTS.userInput.value.trim();
    if (!msg) return;

    addMessageToUI(msg, true);
    ELEMENTS.userInput.value = '';
    ELEMENTS.userInput.disabled = true;

    // NAME CAPTURE
    if (!currentState.intervieweeName) {
        currentState.intervieweeName = msg;
        console.log("Name captured:", msg);

        try {
            await saveCurrentState();
            console.log("State saved (or skipped)");
        } catch (err) {
            console.error("Error saving state:", err);
        }

        showTyping();
        console.log("Typing indicator shown");

        try {
            console.log("Calling Gemini...");
            const history = currentState.fullTranscript.map(t => ({ role: t.role, text: t.text }));
            const aiMsg = await callAIConversation(history, msg);
            console.log("Gemini responded:", aiMsg);

            removeTyping();
            addMessageToUI(aiMsg);

            updateTranscript(msg, 'user');
            updateTranscript(aiMsg, 'assistant');

            try {
                await saveCurrentState();
            } catch (err) {
                console.error("Error saving state after response:", err);
            }
        } catch (err) {
            removeTyping();
            showToast("Erro ao processar mensagem.", "error");
            console.error(err);
        } finally {
            ELEMENTS.userInput.disabled = false;
            ELEMENTS.userInput.focus();
        }
        return;
    }

    // REGULAR CONVERSATION
    showTyping();
    try {
        updateTranscript(msg, 'user');
        const history = currentState.fullTranscript.slice(0, -1).map(t => ({ role: t.role, text: t.text }));

        // Save user message first
        try {
            await saveCurrentState();
        } catch (e) { console.error("Error saving user msg:", e); }

        const aiMsg = await callAIConversation(history, msg);

        removeTyping();
        addMessageToUI(aiMsg);

        updateTranscript(aiMsg, 'assistant');

        try {
            await saveCurrentState();
        } catch (e) { console.error("Error saving bot msg:", e); }

    } catch (err) {
        removeTyping();
        showToast("Erro de conexão.", "error");
        console.error(err);
    } finally {
        ELEMENTS.userInput.disabled = false;
        ELEMENTS.userInput.focus();
    }
}

function updateTranscript(text, role) {
    currentState.fullTranscript.push({ role, text });
}

async function saveCurrentState(finalObs = null, analysisData = null) {
    if (!currentState.user) return;

    // Se for usuário fallback (erro no firebase), não tenta salvar no Firestore
    // Se for usuário fallback (erro no firebase), tenta salvar mesmo assim (se regras permitirem)
    if (currentState.user.isFallback) {
        console.warn("Modo offline: Tentando salvar no Firestore (Permissão dependente de regras).");
        // Não retorna mais, deixa tentar
    }

    let payload = {
        userId: currentState.user.uid,
        intervieweeName: currentState.intervieweeName,
        transcript: currentState.fullTranscript,
        updatedAt: serverTimestamp(),
        lastMessage: currentState.fullTranscript.length > 0 ? currentState.fullTranscript[currentState.fullTranscript.length - 1].text : "Início"
    };

    if (finalObs) payload.finalObservation = finalObs;
    if (analysisData) {
        payload = { ...payload, ...analysisData };
    }

    await saveInterviewData({
        currentSessionId: currentState.currentSessionId,
        payload
    });
}

async function handleFinishSession() {
    const obsInput = document.getElementById('final-obs');
    const obs = obsInput.value;
    const btn = document.querySelector('#modal-finish button.bg-slate-900');
    const originalText = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-brain fa-pulse"></i> Analisando Dados (IA)...';
    btn.disabled = true;

    try {
        await saveCurrentState(obs);

        let admissionData = {};
        try {
            const transcriptText = currentState.fullTranscript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');
            const data = await analyzeInterviewData(transcriptText, obs);
            if (data) admissionData = data;
        } catch (err) {
            console.error("AI Analysis Failed:", err);
            showToast("Erro na análise. Dados brutos salvos.", "warning");
        }

        await saveCurrentState(obs, admissionData);

        // Reset
        currentState.currentSessionId = crypto.randomUUID();
        currentState.fullTranscript = [];
        currentState.intervieweeName = null;

        resetChatUI();
        obsInput.value = '';
        toggleModal('finish');
        showToast("Sessão salva e analisada e encerrada!", "success");

    } catch (e) {
        console.error(e);
        showToast("Erro fatal ao salvar.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- DASHBOARD & ADMIN ---

function switchTab(tab) {
    if (tab === 'chat') {
        document.getElementById('section-chat').classList.remove('hidden');
        document.getElementById('section-admin').classList.add('hidden');
        updateTabStyles('chat');
    } else {
        requestAdminAccess();
    }
}

function requestAdminAccess() {
    document.getElementById('admin-password').value = '';
    document.getElementById('password-error').classList.add('hidden');
    toggleModal('password');
    setTimeout(() => document.getElementById('admin-password').focus(), 100);
}

function verifyPassword() {
    const pass = document.getElementById('admin-password').value;
    if (pass === 'admin123') {
        toggleModal('password');
        document.getElementById('section-chat').classList.add('hidden');
        document.getElementById('section-admin').classList.remove('hidden');
        updateTabStyles('admin');
        if (!currentState.myChart) initChart();
        showToast("Acesso autorizado", "success");
    } else {
        const err = document.getElementById('password-error');
        const input = document.getElementById('admin-password');
        err.classList.remove('hidden');
        input.classList.add('border-rose-300', 'bg-rose-50');
        setTimeout(() => input.classList.remove('border-rose-300', 'bg-rose-50'), 500);
    }
}

function updateTabStyles(activeTab) {
    const btnChat = document.getElementById('tab-chat');
    const btnAdmin = document.getElementById('tab-admin');
    const activeClasses = ['bg-white', 'shadow-sm', 'text-slate-800'];
    const inactiveClasses = ['text-slate-400', 'hover:text-slate-600'];

    if (activeTab === 'chat') {
        btnChat.classList.add(...activeClasses);
        btnChat.classList.remove(...inactiveClasses);
        btnAdmin.classList.remove(...activeClasses);
        btnAdmin.classList.add(...inactiveClasses);
    } else {
        btnAdmin.classList.add(...activeClasses);
        btnAdmin.classList.remove(...inactiveClasses);
        btnChat.classList.remove(...activeClasses);
        btnChat.classList.add(...inactiveClasses);
    }
}

function loadInterviews() {
    if (!currentState.user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'entrevistas'), orderBy('updatedAt', 'desc'));

    if (currentState.unsubscribeSnapshots) currentState.unsubscribeSnapshots();

    // Se for usuário fallback, não tenta conectar no Firestore
    // Se for usuário fallback, tenta conectar no Firestore (se regras permitirem)
    if (currentState.user.isFallback) {
        console.warn("Modo Offline: Tentando carregar dados do Firestore...");
        // Não retorna mais
    }

    currentState.unsubscribeSnapshots = onSnapshot(q, (snapshot) => {
        currentState.allInterviews = [];
        const list = document.getElementById('interviews-list');
        if (!list) return;

        document.getElementById('stat-total').textContent = snapshot.size;
        list.innerHTML = '';

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            currentState.allInterviews.push(data);

            const obsBadge = data.finalObservation ? '<span class="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded border border-indigo-100 font-semibold mb-3">Possui Obs.</span>' : '';
            const displayName = data.intervieweeName ? data.intervieweeName : `ID: ${docSnap.id.substring(0, 6)}`;

            let classTag = '';
            if (data.classificacao_final) {
                const colors = data.classificacao_final === 'quente' ? 'bg-emerald-100 text-emerald-800' :
                    data.classificacao_final === 'morno' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600';
                classTag = `<span class="${colors} px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ml-2">${data.classificacao_final}</span>`;
            }

            const card = document.createElement('div');
            card.className = "bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer relative group";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <span class="text-xs font-bold text-slate-900 font-mono">${displayName}</span>
                        ${classTag}
                    </div>
                    <span class="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">${data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000).toLocaleDateString() : 'Hoje'}</span>
                </div>
                ${obsBadge}
                <p class="text-xs text-slate-600 line-clamp-3 italic mb-3 bg-slate-50 p-2 rounded border border-slate-100">"${data.lastMessage}"</p>
                ${data.finalObservation ? `<div class="mt-3 pt-3 border-t border-slate-100"><p class="text-[10px] font-bold text-slate-900 mb-1">Nota do Consultor:</p><p class="text-xs text-slate-600">${data.finalObservation}</p></div>` : ''}
            `;
            list.appendChild(card);
        });
    });
}

function initChart(data = { labels: ['Aguardando Processamento'], datasets: [{ data: [0] }] }) {
    if (!document.getElementById('painsChart')) return;
    const ctx = document.getElementById('painsChart').getContext('2d');
    if (window.Chart) {
        currentState.myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Ocorrências Identificadas',
                    data: data.values,
                    backgroundColor: '#4f46e5',
                    borderRadius: 4,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

async function generateAIInsights() {
    if (!currentState.allInterviews.length) return showToast("É necessário coletar ao menos uma entrevista.", "error");
    const btn = document.getElementById('btn-ai-insight');
    const originalContent = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Processando Matriz...';

    const pool = currentState.allInterviews.map(i => {
        const trans = (i.transcript || []).map(t => t.text).join(' ');
        const obs = i.finalObservation ? `[OBS CONSULTOR: ${i.finalObservation}]` : '';
        return `ENTREVISTADO: ${i.intervieweeName || 'Anônimo'} | CONVERSA: ${trans} ${obs}`;
    }).join(' | ');

    const prompt = `Atue como Analista de Dados Sênior. Analise as seguintes entrevistas de validação de produto.
    1. Categorize as principais reclamações (ex: Gestão Financeira, Adesão/Retenção, Comunicação/WhatsApp).
    2. Estime a receptividade (%) ao produto "Premium/Biohacking" baseado no sentimento das respostas.
    Retorne APENAS JSON: { "pains": [{"label": "string", "value": number}], "interestPercentage": "string" }
    DADOS: ${pool}`;

    try {
        // const rawJson = await callGeminiSimplePrompt(prompt); // Deprecated
        const rawJson = await callAISimplePrompt(prompt);
        const jsonStr = rawJson.replace(/```json|```/g, '').trim();
        const result = JSON.parse(jsonStr);

        if (currentState.myChart) {
            currentState.myChart.data.labels = result.pains.map(p => p.label);
            currentState.myChart.data.datasets[0].data = result.pains.map(p => p.value);
            currentState.myChart.update();
        }
        document.getElementById('stat-interest').textContent = result.interestPercentage;
        showToast("Insights atualizados com sucesso!", "success");
    } catch (err) {
        console.error(err);
        showToast("Erro ao processar insights.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

// Global exposure
window.switchTab = switchTab;
window.requestAdminAccess = requestAdminAccess;
window.verifyPassword = verifyPassword;
window.generateAIInsights = generateAIInsights;
window.toggleModal = toggleModal;
window.closeModal = toggleModal;
window.finishInterview = () => toggleModal('finish');
window.confirmFinish = handleFinishSession;
window.handlePassEnter = (e) => { if (e.key === 'Enter') verifyPassword(); };
