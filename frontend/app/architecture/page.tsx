"use client";

import React from 'react';
import {
    Database,
    Server,
    Globe,
    Bot,
    LineChart,
    Newspaper,
    ArrowRight,
    Zap,
    Layers
} from 'lucide-react';

export default function ArchitecturePage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-2 overflow-hidden">

            {/* Title Area */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">AI Invest Platform Architecture</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">System Flow: Client → Gateway → Microservices → Data</p>
            </div>

            {/* Main Diagram Container - Horizontal Layout */}
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-row items-center gap-2 max-w-full overflow-x-auto">

                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                {/* 1. Client Layer (Left) */}
                <div className="z-10 flex flex-col items-center gap-2 shrink-0">
                    <LayerLabel label="Client Layer" />
                    <ServiceNode
                        title="Next.js Client"
                        icon={<Globe className="w-5 h-5 text-blue-500" />}
                        description="App Router / SSR"
                        details={["SEO Content", "Zustand Store", "Recharts"]}
                        color="blue"
                        width="w-48"
                    />
                </div>

                {/* Arrow 1 */}
                <ConnectionArrow label="HTTPS" />

                {/* 2. Gateway Layer */}
                <div className="z-10 flex flex-col items-center gap-2 shrink-0">
                    <LayerLabel label="API Layer" />
                    <ServiceNode
                        title="FastAPI Gateway"
                        icon={<Server className="w-5 h-5 text-green-500" />}
                        description="Async Entrypoint"
                        details={["JWT Auth", "Rate Limiting", "Pydantic Validation"]}
                        color="green"
                        width="w-48"
                    />
                </div>

                {/* Arrow 2 (Split) */}
                <div className="z-10 flex flex-col items-center justify-center h-full px-1 shrink-0">
                    <div className="text-[10px] text-slate-400 font-mono mb-1">Async</div>
                    <ArrowRight className="text-slate-300 w-5 h-5" />
                </div>

                {/* 3. Services Layer (Stacked Vertically) */}
                <div className="z-10 flex flex-col items-center gap-2 my-auto shrink-0">
                    <LayerLabel label="Micro-Services" />

                    {/* Crawler */}
                    <ServiceNode
                        title="Crawler Service"
                        icon={<Newspaper className="w-4 h-4 text-orange-500" />}
                        description="HTTPX Worker"
                        details={["User-Agent Rotation", "Exp. Backoff", "RSS Parsing"]}
                        color="orange"
                        width="w-48"
                        compact={true}
                    />

                    {/* Quant */}
                    <ServiceNode
                        title="Quant Service"
                        icon={<LineChart className="w-4 h-4 text-purple-500" />}
                        description="Backtest Engine"
                        details={["Numba JIT Core", "Vectorized Calc", "Event Logic"]}
                        color="purple"
                        width="w-48"
                        compact={true}
                    />

                    {/* AI */}
                    <ServiceNode
                        title="AI Agent"
                        icon={<Bot className="w-4 h-4 text-indigo-500" />}
                        description="LLM RAG Service"
                        details={["Gemini 2 Pro", "Semantic Filter", "Context Build"]}
                        color="indigo"
                        width="w-48"
                        compact={true}
                    />
                </div>

                {/* Arrow 3 */}
                <div className="z-10 flex flex-col items-center justify-center h-full px-1 shrink-0">
                    <ArrowRight className="text-slate-300 w-5 h-5" />
                </div>

                {/* 4. Data Layer (Stacked) */}
                <div className="flex flex-col gap-2 items-center h-full shrink-0 z-10">
                    <LayerLabel label="Data Layer" />
                    <div className="flex flex-col gap-4 items-center justify-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800 w-full flex-1">
                        <DatabaseNode
                            title="PostgreSQL"
                            desc="Main DB"
                            icon={<Database className="w-5 h-5 text-indigo-100" />}
                        />
                        <div className="w-full border-t border-dashed border-slate-300 dark:border-slate-700"></div>
                        <DatabaseNode
                            title="Redis"
                            desc="Cache/Queue"
                            icon={<Zap className="w-5 h-5 text-yellow-300" />}
                        />
                    </div>
                </div>

                {/* Version Tag 
                <div className="absolute bottom-2 right-4 text-[10px] font-mono text-slate-300">
                    v2.1-Compact
                </div>
                */}
            </div>
        </div>
    );
}

// Components
function LayerLabel({ label }: { label: string }) {
    return <div className="text-[14px] uppercase tracking-wider font-bold text-slate-400 mb-1">{label}</div>
}

function ConnectionArrow({ label }: { label: string }) {
    return (
        <div className="z-0 flex flex-col items-center justify-center px-1">
            <div className="text-[9px] text-slate-400 bg-white dark:bg-slate-900 border px-1 rounded-full mb-[-8px] relative z-10">{label}</div>
            <div className="w-12 h-0.5 bg-slate-300 dark:bg-slate-700"></div>
            <ArrowRight className="w-4 h-4 text-slate-300 -ml-2" />
        </div>
    )
}

function ServiceNode({ title, icon, description, details, color, width = "w-56", compact = false }: any) {
    const colorStyles: any = {
        blue: "border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800",
        green: "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800",
        orange: "border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800",
        purple: "border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800",
        indigo: "border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800",
    };

    return (
        <div className={`${width} rounded-lg border shadow-sm transition-all hover:shadow-md ${colorStyles[color]} p-3 flex flex-col gap-2 relative bg-white dark:bg-slate-900`}>
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-100 shadow-sm shrink-0">
                    {icon}
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                    {!compact && <p className="text-[10px] text-slate-500">{description}</p>}
                </div>
            </div>

            {/* Details */}
            <ul className="text-[10px] text-slate-600 dark:text-slate-400 space-y-0.5 list-disc pl-3">
                {details.map((d: string, i: number) => (
                    <li key={i}>{d}</li>
                ))}
            </ul>
        </div>
    )
}

function DatabaseNode({ title, desc, icon }: any) {
    return (
        <div className="flex items-center gap-3 w-32">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 shadow-md border-2 border-slate-400 cursor-pointer hover:scale-105 transition-transform">
                {icon}
            </div>
            <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{title}</div>
                <div className="text-[10px] text-slate-500">{desc}</div>
            </div>
        </div>
    )
}
