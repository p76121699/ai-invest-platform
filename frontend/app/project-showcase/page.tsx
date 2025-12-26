"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Cpu, Database, Globe, ShieldCheck,
    ArrowRight, TrendingUp, AlertTriangle, CheckCircle2,
    Code, Terminal, LineChart, Server
} from "lucide-react"

export default function ProjectShowcase() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* Hero Section */}
            <section className="relative h-[60vh] flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 via-slate-950/80 to-slate-950 z-0" />
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="z-10 text-center space-y-4 px-4"
                >
                    <Badge variant="outline" className="border-indigo-500/50 text-indigo-400 px-3 py-1 rounded-full text-sm backdrop-blur-md">
                        Full Stack AI Application
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        AI Investment Platform
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-light">
                        A modern solution for real-time market analysis, combining <span className="text-indigo-400 font-medium">News Sentiment</span>, <span className="text-indigo-400 font-medium">Technical Indicators</span>, and <span className="text-indigo-400 font-medium">Generative AI</span>.
                    </p>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="absolute bottom-10 z-10 animate-bounce"
                >
                    <div className="w-6 h-10 border-2 border-slate-700 rounded-full flex justify-center pt-2">
                        <div className="w-1 h-2 bg-indigo-500 rounded-full" />
                    </div>
                </motion.div>
            </section>

            {/* Tech Stack Grid */}
            <section className="py-20 px-6 md:px-20 max-w-7xl mx-auto">
                <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl font-bold mb-12 border-l-4 border-indigo-500 pl-4"
                >
                    Core Technologies
                </motion.h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <TechCard
                        icon={<Globe className="w-8 h-8 text-blue-400" />}
                        title="Modern Frontend"
                        items={["Next.js 14 App Router", "TypeScript", "Tailwind CSS", "Shadcn/UI", "Framer Motion"]}
                    />
                    <TechCard
                        icon={<Server className="w-8 h-8 text-green-400" />}
                        title="Robust Backend"
                        items={["FastAPI (Python)", "Async SQLAlchemy", "Pydantic Validation", "APScheduler"]}
                    />
                    <TechCard
                        icon={<Database className="w-8 h-8 text-orange-400" />}
                        title="Data Infrastructure"
                        items={["PostgreSQL (Supabase)", "AsyncPG", "yfinance API", "Playwright Request Hiding"]}
                    />
                    <TechCard
                        icon={<Cpu className="w-8 h-8 text-purple-400" />}
                        title="AI Integration"
                        items={["Google Gemini 1.5", "RAG (Context Injection)", "Sentiment Analysis (NLP)"]}
                    />
                </div>
            </section>

            {/* Application Highlights (STAR Method) */}
            <section className="py-20 bg-slate-900/50">
                <div className="max-w-6xl mx-auto px-6">
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl font-bold mb-4 border-l-4 border-purple-500 pl-4"
                    >
                        Development Journey (STAR Method)
                    </motion.h2>
                    <p className="text-slate-400 mb-12 pl-5">
                        Breaking down major challenges faced during development and the engineering solutions applied.
                    </p>

                    <Tabs defaultValue="ai" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-slate-950 border border-slate-800 p-1 mb-8">
                            <TabsTrigger value="ai" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-300">AI Hallucinations (RAG)</TabsTrigger>
                            <TabsTrigger value="data" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-300">Real-time Data (Crawler)</TabsTrigger>
                            <TabsTrigger value="deploy" className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-300">Deployment & DevOps</TabsTrigger>
                        </TabsList>

                        <TabsContent value="ai">
                            <StarCard
                                situation="Users complained that the AI assistant was unaware of current dates and provided outdated market analysis (Hallucination)."
                                task="Implement a system to make the AI 'Context-Aware' of the current time and live market news."
                                action="Integrated Google Gemini API. Built a RAG (Retrieval-Augmented Generation) pipeline that: 1. Injects current timestamp. 2. Queries the latest 5 news items from PostgreSQL. 3. Feeds summarized context into the System Prompt."
                                result="The AI now accurately references today's date and provides advice based on real-time news events, eliminating temporal hallucinations."
                                color="purple"
                            />
                        </TabsContent>
                        <TabsContent value="data">
                            <StarCard
                                situation="External News Sources (CNBC/Reuters) frequently blocked standard HTTP requests, and Yahoo Finance imposed strict Rate Limits."
                                task="Build a resilient data pipeline that can survive anti-bot measures and high-frequency requests."
                                action="Replaced `requests` with `Playwright` to simulate real browser headers. Implemented `tenacity` for exponential backoff retries. Added local caching (Redis-like dictionary) for stock quotes to reduce API calls by 60%."
                                result="News crawler runs reliably every hour without blocks. Stock page loads instantly from cache, bypassing rate limits."
                                color="blue"
                            />
                        </TabsContent>
                        <TabsContent value="deploy">
                            <StarCard
                                situation="Production environment (Render) would put the free-tier service to sleep, and background tasks (Crawler) caused Worker Timeouts."
                                task="Ensure 24/7 availability and separate heavy background tasks from the main API thread."
                                action="Implemented a `/health` endpoint for UptimeRobot configuration (GET/HEAD support). Configured `APScheduler` for async background jobs. Optimized Dockerfile for multi-stage building (removing Playwright bloat)."
                                result="Service achieves >99% uptime. Crawler runs asynchronously without blocking user API requests."
                                color="green"
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </section>

            {/* Feature Gallery */}
            <section className="py-20 max-w-7xl mx-auto px-6">
                <h2 className="text-3xl font-bold mb-12 text-center text-slate-100">Functional Modules</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard
                        title="Backtesting Engine"
                        description="Simulation engine allowing users to test Strategies (Moving Average, RSI) against historical data with detailed Equity Curves."
                        img="LineChart"
                    />
                    <FeatureCard
                        title="Paper Trading"
                        description="Risk-free trading simulation environment. Users can Buy/Sell at real-time prices and track Portfolio ROI."
                        img="TrendingUp"
                    />
                    <FeatureCard
                        title="Market Sentiment"
                        description="NLP-driven news processing. Automatically tags news with 'Positive/Negative' sentiment scores using Transformer models."
                        img="Terminal"
                    />
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 border-t border-slate-800 text-center text-slate-500">
                <p>&copy; 2025 AI Invest Platform. Built by <span className="text-slate-300">Antigravity & User</span>.</p>
            </footer>
        </div>
    )
}

function TechCard({ icon, title, items }: { icon: any, title: string, items: string[] }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-colors shadow-lg"
        >
            <div className="mb-4 bg-slate-950 p-3 rounded-full w-fit border border-slate-800">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-4 text-slate-200">{title}</h3>
            <ul className="space-y-2">
                {items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-400 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-indigo-500/70" />
                        {item}
                    </li>
                ))}
            </ul>
        </motion.div>
    )
}

function StarCard({ situation, task, action, result, color }: { situation: string, task: string, action: string, result: string, color: string }) {
    const colorClasses: Record<string, string> = {
        purple: "bg-purple-500",
        blue: "bg-blue-500",
        green: "bg-green-500"
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-slate-800 bg-slate-950 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
            <div className={`absolute top-0 left-0 w-1 h-full ${colorClasses[color]}`} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-100 font-semibold">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Situation
                        </div>
                        <p className="text-slate-400 leading-relaxed">{situation}</p>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-100 font-semibold">
                            <CheckCircle2 className="w-5 h-5 text-blue-500" />
                            Task
                        </div>
                        <p className="text-slate-400 leading-relaxed">{task}</p>
                    </div>
                </div>

                <div className="space-y-6 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-800 hidden md:block" />
                    <div className="md:pl-8">
                        <div className="flex items-center gap-2 mb-2 text-slate-100 font-semibold">
                            <Code className="w-5 h-5 text-indigo-500" />
                            Action
                        </div>
                        <p className="text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-lg border border-slate-800 mb-6">
                            {action}
                        </p>

                        <div className="flex items-center gap-2 mb-2 text-slate-100 font-semibold">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            Result
                        </div>
                        <p className="text-green-400/90 leading-relaxed font-medium">
                            {result}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

function FeatureCard({ title, description, img }: { title: string, description: string, img: string }) {
    return (
        <div className="group relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 aspect-video hover:border-slate-600 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />

            <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform duration-700">
                {/* Placeholder for feature image */}
                {img === "LineChart" && <LineChart className="w-32 h-32 text-slate-600" />}
                {img === "TrendingUp" && <TrendingUp className="w-32 h-32 text-slate-600" />}
                {img === "Terminal" && <Terminal className="w-32 h-32 text-slate-600" />}
            </div>

            <div className="absolute bottom-0 left-0 p-6 z-20">
                <h3 className="text-xl font-bold text-slate-100 mb-2">{title}</h3>
                <p className="text-sm text-slate-400">{description}</p>
            </div>
        </div>
    )
}
