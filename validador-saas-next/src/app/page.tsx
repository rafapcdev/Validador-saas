"use client";

import { useState } from "react";
import { ChatInterface } from "@/features/interview/components/ChatInterface";
import { DashboardView } from "@/features/admin/components/DashboardView";
import { cn } from "@/lib/utils";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'chat' | 'admin'>('chat');

  return (
    <div className="max-w-6xl mx-auto p-6 min-h-screen">
      {/* Header Corporativo */}
      <header className="flex flex-col md:flex-row items-center justify-between mb-8 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-xl shadow-lg">
            <i className="fas fa-layer-group text-white text-xl"></i>
            {/* Fallback icon if font-awesome not loaded yet, or use Lucide */}
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Biohacker SaaS</h1>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Pesquisa de Mercado | Maricá, RJ</p>
          </div>
        </div>
        <nav className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              "px-6 py-2 text-sm font-semibold rounded-md transition-all",
              activeTab === 'chat' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Entrevista
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={cn(
              "px-6 py-2 text-sm font-semibold rounded-md transition-all flex items-center gap-2",
              activeTab === 'admin' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Dashboard
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      {activeTab === 'chat' ? (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna de Contexto (Original) */}
          <div className="lg:col-span-4 space-y-6 hidden lg:block">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                Objetivos da Pesquisa
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-1 bg-blue-600 rounded-full"></div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">VALIDAR PRECIFICAÇÃO</p>
                    <p className="text-xs text-slate-500 mt-1">O Personal pagaria mais por dados de saúde?</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1 bg-emerald-500 rounded-full"></div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">MAPEAR GARGALOS</p>
                    <p className="text-xs text-slate-500 mt-1">Identificar ineficiências operacionais.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1 bg-indigo-500 rounded-full"></div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">ECCOSISTEMA LOCAL</p>
                    <p className="text-xs text-slate-500 mt-1">Aderência ao pagamento via Mumbuca.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Dica do Consultor</p>
              <p className="text-sm leading-relaxed text-slate-300">"Não tente vender o app agora. Foque em entender quanto tempo ele perde por semana com tarefas manuais. A dor gera a venda."</p>
            </div>
          </div>

          {/* Chat Interface Container */}
          <div className="lg:col-span-8">
            <ChatInterface />
          </div>
        </main>
      ) : (
        <main>
          <DashboardView />
        </main>
      )}
    </div>
  );
}
