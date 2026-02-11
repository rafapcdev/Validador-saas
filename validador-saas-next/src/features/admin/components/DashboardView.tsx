"use client";

import { useState, useEffect } from "react";
import { getInterviews, analyzeInterview } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, LayoutDashboard, RefreshCcw, LogOut } from "lucide-react";
import { PainChart } from "./PainChart";
import { SentimentPie } from "./SentimentPie";
import { ChatTable } from "./ChatTable";
import { useToast } from "@/components/ui/use-toast";

export function DashboardView() {
    const [password, setPassword] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const { toast } = useToast();

    // Stats Calculation
    const calculateStats = (items: any[]) => {
        const analyzed = items.filter(i => i.score_qualificacao !== undefined);
        const total = items.length;
        const qualified = analyzed.filter(i => i.score_qualificacao >= 70).length;

        // Sentiment (Classification)
        const sentimentCounts: any = { quente: 0, morno: 0, frio: 0 };
        analyzed.forEach(i => {
            if (i.classificacao_final) sentimentCounts[i.classificacao_final]++;
        });

        const sentimentData = [
            { name: 'Quente', value: sentimentCounts.quente, color: '#22c55e' },
            { name: 'Morno', value: sentimentCounts.morno, color: '#eab308' },
            { name: 'Frio', value: sentimentCounts.frio, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Pain Points
        const painMap: any = {};
        analyzed.forEach(i => {
            if (i.detalhes?.principais_dores) {
                i.detalhes.principais_dores.forEach((pain: string) => {
                    painMap[pain] = (painMap[pain] || 0) + 1;
                });
            }
        });

        const painData = Object.entries(painMap)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        setStats({
            total,
            qualified,
            analyzedCount: analyzed.length,
            sentimentData,
            painData
        });
    };

    const fetchData = async () => {
        setLoading(true);
        const res = await getInterviews();
        if (res.success && res.data) {
            setData(res.data);
            calculateStats(res.data);
        }
        setLoading(false);
    };

    const handleAnalyze = async (id: string) => {
        setAnalyzingId(id);
        const target = data.find(d => d.id === id);
        if (!target) return;

        toast({ title: "Iniciando análise...", description: "A IA está processando o histórico da conversa." });

        const res = await analyzeInterview(id, target.messages, target.intervieweeName);

        if (res.success) {
            toast({ title: "Análise concluída!", description: "Dados estruturados com sucesso." });
            // Update local state
            const newData = data.map(d => d.id === id ? { ...d, ...res.data } : d);
            setData(newData);
            calculateStats(newData);
        } else {
            toast({ title: "Erro", description: res.error, variant: "destructive" });
        }
        setAnalyzingId(null);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" /> Acesso Administrativo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => { e.preventDefault(); if (password === "admin123") { setIsAuthenticated(true); fetchData(); } else alert("Senha incorreta"); }} className="flex gap-2">
                            <Input
                                type="password"
                                placeholder="Senha (admin123)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Button type="submit">Entrar</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <LayoutDashboard className="h-8 w-8" />
                    Dashboard de Validação
                </h2>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsAuthenticated(false)}>
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Entrevistas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Leads Qualificados (Hot)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{stats?.qualified || 0}</div>
                        <p className="text-xs text-muted-foreground">Score &gt; 70</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taxa de Análise</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.total ? Math.round((stats.analyzedCount / stats.total) * 100) : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">{stats?.analyzedCount || 0} processados</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <PainChart data={stats?.painData || []} />
                <SentimentPie data={stats?.sentimentData || []} />
            </div>

            {/* Recent Analysis Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Entrevistas Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChatTable
                        data={data}
                        onAnalyze={handleAnalyze}
                        analyzingId={analyzingId}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
