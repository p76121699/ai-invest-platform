"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Cpu, Database, Globe,
    ArrowRight, TrendingUp, TriangleAlert, CheckCircle,
    Code, Terminal, LineChart, Server, Activity
} from "lucide-react"

export default function ProjectShowcase() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* Hero Section */}
            <section className="relative h-[70vh] flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950/80 to-slate-950 z-0" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="z-10 text-center space-y-6 px-4 max-w-4xl"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex justify-center"
                    >
                        <Badge variant="outline" className="border-indigo-500/50 text-indigo-300 px-4 py-1.5 rounded-full text-sm backdrop-blur-md uppercase tracking-wider">
                            Full Stack AI Architecture
                        </Badge>
                    </motion.div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-500">
                        AI INVEST
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-400 font-light leading-relaxed">
                        Redefining market analysis with <span className="text-indigo-400 font-medium">Context-Aware AI</span> and <span className="text-indigo-400 font-medium">Real-Time Data Pipelines</span>.
                    </p>

                    <div className="flex justify-center gap-4 pt-8">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-3xl font-bold text-white">99.9%</span>
                            <span className="text-xs text-slate-500 uppercase tracking-widest">Uptime</span>
                        </div>
                        <div className="w-px h-12 bg-slate-800" />
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-3xl font-bold text-white">Gemini 1.5</span>
                            <span className="text-xs text-slate-500 uppercase tracking-widest">Model</span>
                        </div>
                        <div className="w-px h-12 bg-slate-800" />
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-3xl font-bold text-white">&lt;50ms</span>
                            <span className="text-xs text-slate-500 uppercase tracking-widest">Latency</span>
                        </div>
                    </div>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="absolute bottom-10 z-10 animate-bounce"
                >
                    <Activity className="w-6 h-6 text-slate-600" />
                </motion.div>
            </section>

            {/* Tech Stack Marquee (Static Grid for now) */}
            <section className="py-20 bg-slate-900/30 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <p className="text-center text-slate-500 text-sm uppercase tracking-widest mb-10">Powering Next-Gen Fintech</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-80">
                        <TechItem icon={<Globe />} title="Next.js 14" desc="App Router & SSR" />
                        <TechItem icon={<Server />} title="FastAPI" desc="High Performance Python" />
                        <TechItem icon={<Database />} title="PostgreSQL" desc="Async SQLAlchemy" />
                        <TechItem icon={<Cpu />} title="Google Gemini" desc="RAG & Context Injection" />
                    </div>
                </div>
            </section>

            {/* STAR Case Studies */}
            <section className="py-32 px-6 max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Engineering Challenges</h2>
                    <p className="text-slate-400 text-lg max-w-2xl">
                        A transparent look at the technical hurdles we overcame using the STAR methodology (Situation, Task, Action, Result).
                    </p>
                </motion.div>

                <Tabs defaultValue="ai" className="w-full">
                    <TabsList className="bg-transparent border-b border-slate-800 w-full justify-start h-auto p-0 mb-12 gap-8">
                        <ShowcaseTabTrigger value="ai" label="01. AI Hallucinations" />
                        <ShowcaseTabTrigger value="data" label="02. Anti-Bot Crawling" />
                        <ShowcaseTabTrigger value="devops" label="03. Scale & Uptime" />
                    </TabsList>

                    <TabsContent value="ai">
                        <CaseStudyCard
                            id="01"
                            title="Context-Aware RAG Implementation"
                            situation="Standard LLMs are cut off from real-time data, causing them to hallucinate outdated market dates (e.g., thinking it's 2023)."
                            task="Create a mechanism to inject 'Right Now' context without retraining the model."
                            action="Built a dynamic RAG pipeline in Python. Before every request, the backend fetches the latest 5 news summaries from PostgreSQL and injects a 'System Context' block containing Today's Date and News Headlines into the Gemini prompt."
                            result="Eliminated temporal hallucinations. The AI now correctly identifies today's market events and correlates them with its internal knowledge base."
                            techs={["Python", "Gemini API", "SQLAlchemy", "Prompt Engineering"]}
                        />
                    </TabsContent>
                    <TabsContent value="data">
                        <CaseStudyCard
                            id="02"
                            title="Resilient News Crawler"
                            situation="Financial news sites (Reuters, CNBC) aggressively block automated scrapers, leading to 403 Forbidden errors and data gaps."
                            task="Develop a stealthy crawler capable of mimicking human browsing behavior."
                            action="Migrated from `requests` to `Playwright` for headless browser simulation. Implemented 'User-Agent Rotation' and exponential backoff retry logic using the `tenacity` library. Added a Redis-style caching layer."
                            result="Successfully bypassed anti-bot protections, achieving 99% scrape success rate with hourly updates."
                            techs={["Playwright", "AsyncIO", "Tenacity", "Headless Chrome"]}
                        />
                    </TabsContent>
                    <TabsContent value="devops">
                        <CaseStudyCard
                            id="03"
                            title="Zero-Downtime Architecture"
                            situation="The free-tier hosting provider (Render) would put the app to sleep after inactivity, and long-running crawler tasks caused Worker Timeouts."
                            task="Ensure 24/7 availability and decouple heavy compute tasks."
                            action="1. Implemented a `/health` endpoint to support external monitoring (UptimeRobot). 2. Offloaded crawler jobs to `APScheduler` background threads. 3. Optimized Dockerfile to reduce build size and startup time."
                            result="Service stays awake 24/7. Background tasks run asynchronously without blocking the main API thread, preventing Worker Timeouts."
                            techs={["Docker", "UptimeRobot", "APScheduler", "Health Checks"]}
                        />
                    </TabsContent>
                </Tabs>
            </section>

            {/* UI Gallery */}
            <section className="py-20 bg-slate-900 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl font-bold mb-12 text-center">Interactive Modules</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GalleryItem title="Technical Analysis" desc="Interactive charts with MA/RSI indicators." />
                        <GalleryItem title="Backtesting Engine" desc="Historical simulation with Equity Curves." />
                        <GalleryItem title="Sentiment Analysis" desc="Real-time NLP scoring of market news." />
                    </div>
                </div>
            </section>
        </div>
    )
}

function TechItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex flex-col items-center text-center gap-3">
            <div className="p-3 bg-slate-800 rounded-xl text-indigo-400">
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-slate-200">{title}</h4>
                <p className="text-sm text-slate-500">{desc}</p>
            </div>
        </div>
    )
}

function ShowcaseTabTrigger({ value, label }: { value: string, label: string }) {
    return (
        <TabsTrigger
            value={value}
            className="pb-4 rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-400 text-slate-500 text-lg px-0 hover:text-slate-300 transition-colors"
        >
            {label}
        </TabsTrigger>
    )
}

function CaseStudyCard({ id, title, situation, task, action, result, techs }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12"
        >
            <div className="lg:col-span-4 space-y-8">
                <div>
                    <span className="text-indigo-500 font-mono text-sm tracking-wider">CHALLENGE #{id}</span>
                    <h3 className="text-3xl font-bold mt-2 mb-4 text-white leading-tight">{title}</h3>
                    <div className="flex flex-wrap gap-2">
                        {techs.map((t: string) => (
                            <Badge key={t} variant="secondary" className="bg-slate-800 text-slate-400 hover:bg-slate-700">{t}</Badge>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <StarBox icon={<TriangleAlert className="text-amber-500" />} label="Situation" text={situation} />
                <StarBox icon={<CheckCircle className="text-blue-500" />} label="Task" text={task} />
                <StarBox icon={<Code className="text-purple-500" />} label="Action" text={action} className="md:col-span-2 bg-slate-900/50 border-indigo-500/20" />
                <StarBox icon={<TrendingUp className="text-green-500" />} label="Result" text={result} className="md:col-span-2" />
            </div>
        </motion.div>
    )
}

function StarBox({ icon, label, text, className = "" }: any) {
    return (
        <div className={`p-6 rounded-2xl bg-slate-900 border border-slate-800 ${className}`}>
            <div className="flex items-center gap-2 mb-3 font-bold text-slate-200">
                {icon} {label}
            </div>
            <p className="text-slate-400 leading-relaxed text-sm md:text-base">{text}</p>
        </div>
    )
}

function GalleryItem({ title, desc }: any) {
    return (
        <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors group cursor-default">
            <div className="h-40 mb-6 bg-slate-900 rounded-xl flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                <Activity className="w-12 h-12 text-slate-700 group-hover:text-indigo-500 transition-colors" />
            </div>
            <h4 className="text-xl font-bold text-slate-200 mb-2">{title}</h4>
            <p className="text-slate-500">{desc}</p>
        </div>
    )
}
