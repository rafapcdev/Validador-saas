"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Loader2, CheckCircle, AlertCircle } from "lucide-react";
// import { formatDate } from "@/shared/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Interview {
    id: string;
    intervieweeName?: string;
    createdAt?: any;
    status?: string;
    score_qualificacao?: number;
    classificacao_final?: string;
    analysisDate?: number;
}

interface ChatTableProps {
    data: Interview[];
    onAnalyze: (id: string) => void;
    analyzingId: string | null;
}

export function ChatTable({ data, onAnalyze, analyzingId }: ChatTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Classificação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.intervieweeName || "Anônimo"}</TableCell>
                            <TableCell>{item.createdAt?.seconds ? formatDate(item.createdAt.seconds * 1000) : "-"}</TableCell>
                            <TableCell>
                                <Badge variant={item.analysisDate ? "default" : "secondary"}>
                                    {item.analysisDate ? "Analisado" : "Pendente"}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {item.score_qualificacao !== undefined ? (
                                    <div className="flex items-center gap-1">
                                        <span className={item.score_qualificacao > 70 ? "text-green-500 font-bold" : item.score_qualificacao < 40 ? "text-red-500" : "text-yellow-500"}>
                                            {item.score_qualificacao}
                                        </span>
                                        <span className="text-xs text-muted-foreground">/100</span>
                                    </div>
                                ) : "-"}
                            </TableCell>
                            <TableCell>
                                {item.classificacao_final ? (
                                    <Badge variant={item.classificacao_final === 'quente' ? 'default' : item.classificacao_final === 'frio' ? 'destructive' : 'outline'}>
                                        {item.classificacao_final.toUpperCase()}
                                    </Badge>
                                ) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                                {item.analysisDate ? (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled>
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Já analisado</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onAnalyze(item.id)}
                                        disabled={analyzingId === item.id}
                                    >
                                        {analyzingId === item.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                        ) : (
                                            <>
                                                <BrainCircuit className="mr-2 h-4 w-4" />
                                                Analisar
                                            </>
                                        )}
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// Helper formatting function since I don't have access to shared/lib/utils content right now
function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
