export const ELEMENTS = {
    chatDisplay: document.getElementById('chat-display'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    chatForm: document.getElementById('chat-form'),
    typingIndicator: document.getElementById('typing-indicator'),
    toast: document.getElementById('toast'),
    modals: {
        finish: document.getElementById('modal-finish'),
        password: document.getElementById('modal-password'), // Fixed: was missing
        admin: document.getElementById('modal-admin'),
        service: document.getElementById('modal-service')
    },
    // Dashboard elements could be added here
};

export function showToast(msg, type = 'success') {
    // Re-query to ensure we have the element if it was added dynamically or valid
    const toast = document.getElementById('toast');

    if (!toast) {
        console.warn("Toast element not found. Message:", msg);
        alert(msg); // Fallback
        return;
    }

    toast.textContent = msg;
    toast.className = `fixed top-5 right-5 px-6 py-3 rounded-xl shadow-2xl text-white font-medium transform transition-all duration-300 z-50 ${type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
        } translate-y-0 opacity-100`;

    setTimeout(() => {
        toast.className = toast.className.replace('translate-y-0 opacity-100', '-translate-y-10 opacity-0');
    }, 3000);
}

export function showTyping() {
    ELEMENTS.typingIndicator.classList.remove('hidden');
    ELEMENTS.chatDisplay.scrollTop = ELEMENTS.chatDisplay.scrollHeight;
}

export function removeTyping() {
    ELEMENTS.typingIndicator.classList.add('hidden');
}

export function addMessageToUI(text, isUser = false) {
    const div = document.createElement('div');
    div.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`;

    const bubbleStyle = isUser
        ? 'bg-slate-900 text-white rounded-2xl rounded-tr-sm'
        : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm';

    div.innerHTML = `
        <div class="${bubbleStyle} px-5 py-3 shadow-sm max-w-[85%] text-sm leading-relaxed">
            ${text.replace(/\n/g, '<br>')}
        </div>
    `;
    ELEMENTS.chatDisplay.insertBefore(div, ELEMENTS.typingIndicator);
    ELEMENTS.chatDisplay.scrollTop = ELEMENTS.chatDisplay.scrollHeight;
}

export function resetChatUI() {
    ELEMENTS.chatDisplay.innerHTML = `
        <div class="flex justify-start">
            <div class="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
                <p class="text-sm text-slate-700 leading-relaxed">
                    Olá. Sou consultor especializado em tecnologia para o mercado fitness. Estamos conduzindo um estudo sobre gargalos operacionais com profissionais de alta performance em Maricá.
                </p>
            </div>
        </div>
        <div class="flex justify-start mt-4">
            <div class="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
                <p class="text-sm text-slate-700 leading-relaxed">
                    Para iniciarmos o registro, qual é o seu nome, por favor?
                </p>
            </div>
        </div>
        <div id="typing-indicator" class="hidden flex justify-start mb-4">
            <div class="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
                <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
            </div>
        </div>
    `;
    // Re-bind elements if they were overwritten (though here we just updated innerHTML so references are usually kept if parent is same, but typing-indicator was re-created)
    // Update reference for typing indicator
    ELEMENTS.typingIndicator = document.getElementById('typing-indicator');
}

export function toggleModal(modalId) {
    const modal = ELEMENTS.modals[modalId];
    if (!modal) return;

    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('opacity-0', 'scale-95');
        }, 10);
    } else {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}
