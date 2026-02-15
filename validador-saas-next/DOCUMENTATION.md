# Validador de SaaS - Fitness & Wellness
**Documentação Técnica e Arquitetural**
**SaaS Validator Inc.**

---

## 1. Introdução
O **Validador de SaaS** é uma aplicação web interativa projetada para validar ideias de produtos SaaS no nicho de Fitness & Wellness. Utilizando Inteligência Artificial (AI) orquestrada, o sistema atua como um consultor virtual que entrevista profissionais da área (Personal Trainers, Donos de Academia) para identificar dores reais, gargalos operacionais e oportunidades de negócio, sem viés comercial inicial.

## 2. Requisitos do Sistema

### 2.1. Requisitos Funcionais (RF)
- **[RF01] Chat Interativo com IA**: O sistema conduz uma entrevista estruturada via chat, adaptando as perguntas com base nas respostas do usuário.
- **[RF02] Orquestração de IA (Multi-Provider)**: O backend utiliza uma estratégia de "Fallback em Camadas" (Gemini -> Groq -> DeepSeek -> OpenRouter) para garantir alta disponibilidade.
- **[RF03] Validação de Hipóteses**: O sistema identifica automaticamente dores relacionadas a (1) Gestão de Treinos, (2) Retenção de Alunos e (3) Pagamentos.
- **[RF04] Geração de Relatório**: Ao final da entrevista, a IA gera uma análise detalhada (JSON) com o perfil do usuário, dores identificadas e probabilidade de compra.
- **[RF05] Captura de Leads**: O sistema coleta informações de contato (Nome, WhatsApp, E-mail) de forma contextual.
- **[RF06] Modo Admin**: Interface protegida por senha para visualizar os logs de validação e métricas de desempenho.

### 2.2. Requisitos Não Funcionais (RNF)
- **[RNF01] Alta Disponibilidade de IA**: O sistema deve tolerar falhas em qualquer provedor de IA individual sem interromper a entrevista.
- **[RNF02] Responsividade**: Interface otimizada para dispositivos móveis (Mobile-First), simulando a experiência de um app de mensagem (WhatsApp/Telegram).
- **[RNF03] Performance (Edge Ready)**: A aplicação é construída sobre Next.js 15+ (App Router) e hospedada na Vercel, garantindo baixa latência.
- **[RNF04] Estética Premium**: Design moderno ("The Essence") com animações fluidas (Framer Motion), Glassmorphism e tema escuro.
- **[RNF05] Privacidade**: Os dados da entrevista são processados de forma efêmera e armazenados com segurança (Firebase Firestore).

---

## 3. Arquitetura Tecnológica

A solução utiliza uma stack moderna baseada no ecossistema **React/Next.js**, priorizando performance e robustez.

- **Frontend/Backend Framework**: Next.js 15 (App Router, Server Actions).
- **Linguagem**: TypeScript (Strict Mode).
- **Estilização**: Tailwind CSS v4 + Framer Motion (Animações).
- **Banco de Dados**: Firebase Firestore (NoSQL).
- **AI Orchestrator**: Lógica personalizada em Node.js para gerenciar múltiplos provedores de LLM.
- **Provedores de IA**: 
    - Google Gemini (Primário - Flash 1.5)
    - Groq (Secundário - Llama 3)
    - DeepSeek (Terciário)
    - OpenRouter (Quaternário - Mistral/Llama Free)

---

## 4. Estrutura de Diretórios e Modularização

A organização do código segue uma arquitetura baseada em *features* e *serviços*.

```
src/
|-- app/                    # Rotas (Next.js App Router)
|   |-- api/                # Endpoints de API (se necessário)
|   |-- admin/              # Painel Administrativo
|   `-- page.tsx            # Página Principal (Chat)
|
|-- features/               # Módulos de Funcionalidade
|   |-- interview/
|   |   |-- components/     # UI do Chat (Bubble, Input, Typing)
|   |   |-- hooks/          # Lógica de Estado (useChat)
|   |   `-- lib/            # Prompts de Sistema (System Instructions)
|
|-- services/               # Integrações Externas
|   |-- ai/
|   |   |-- orchestrator.ts # Cérebro da IA (Fallback Logic)
|   |   |-- gemini.ts       # Cliente Google
|   |   |-- groq.ts         # Cliente Groq
|   |   |-- deepseek.ts     # Cliente DeepSeek
|   |   `-- openrouter.ts   # Cliente OpenRouter
|   |
|   `-- firebase/           # Configuração do Firestore
|
|-- shared/                 # Componentes Reutilizáveis
|   |-- components/         # UI Kit (Button, Card, Modal)
|   `-- styles/             # CSS Global
|
`-- types/                  # Definições TypeScript (Message, UserProfile)
```

---

## 5. Arquitetura de Componentes (IA Orchestrator)

O componente central do backend é o **Orquestrador de IA**, que garante que o usuário nunca fique sem resposta.

**Fluxo de Decisão:**
1.  **Tentativa 1 (Gemini 1.5 Flash)**: Modelo rápido e gratuito do Google. Se falhar (erro 429, 500, 404)...
2.  **Tentativa 2 (Groq - Llama 3)**: Modelo ultra-rápido. Se falhar (Rate Limit)...
3.  **Tentativa 3 (DeepSeek)**: Modelo de alta precisão (Coder/Chat). Se falhar (Saldo insuficiente)...
4.  **Tentativa 4 (OpenRouter - Mistral/Llama Free)**: Agregador de modelos gratuitos. Se falhar...
5.  **Erro Final**: O sistema notifica o usuário sobre a indisponibilidade total (cenário raro).

---

## 6. Gestão de Estado e Dados

- **Frontend (Client-Side)**:
    - `useChat`: Hook customizado que gerencia o array de mensagens, estado de digitação ("escrevendo...") e scroll automático.
    - `Context API`: Não utilizado excessivamente; o estado é local por sessão de entrevista.

- **Backend (Server-Side)**:
    - `Server Actions`: As chamadas de IA são executadas no servidor para proteger as API Keys.
    - `Firestore`: Armazena o histórico da conversa e o resultado da validação (JSON estruturado).

---

## 7. Interface de Usuário (UX/UI)

### 7.1. Sistema de Chat ("The Essence")
A interface simula um aplicativo de mensagem premium.
- **Bubbles**: Diferenciação visual clara entre Usuário (Direita, Azul/Roxo) e IA (Esquerda, Cinza/Glass).
- **Micro-interações**: Animações suaves ao enviar mensagem, indicador de digitação pulsante e transições de entrada.

### 7.2. Painel Administrativo
Visualização dos dados coletados.
- **Métricas**: Número de entrevistas, taxa de conclusão.
- **Logs**: Visualização detalhada de cada conversa e da análise gerada pela IA.

---

## 8. Segurança

- **Variáveis de Ambiente**: Todas as chaves de API (Gemini, Groq, Firebase) são armazenadas em `.env.local` e nunca expostas ao cliente.
- **Sanitização de Prompt**: O sistema injeta instruções de segurança ("Anti-Viés", "Anti-Alucinação") no prompt do sistema para evitar que a IA saia do personagem.
- **Rate Limiting**: (Implementação via Vercel/Next.js) Proteção contra abuso de chamadas.

---

## 9. Estratégia de Testes e Validação

- **Testes Manuais de IA**: Scripts de "Debug Probe" (`curl`) foram utilizados para validar a conectividade de cada provedor de IA individualmente e o mecanismo de fallback.
- **Validação de Tipos**: TypeScript rigoroso para garantir que as respostas da IA (JSON) sigam o esquema esperado (`zod` ou interfaces TS).

---

## 10. Escalabilidade

A arquitetura *Serverless* (Next.js na Vercel + Firestore) permite que o sistema escale automaticamente de 10 para 10.000 usuários simultâneos sem necessidade de provisionamento de servidores (infraestrutura elástica).

---

**Gerado automaticamente por Validador AI Assistant**
*Data: 08 de Fevereiro de 2026*
