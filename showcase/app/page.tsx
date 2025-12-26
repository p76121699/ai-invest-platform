"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Cpu, Database, Globe,
    ArrowRight, TrendingUp, TriangleAlert, CheckCircle,
    Code, Terminal, LineChart, Server, Activity, ChevronDown, Rocket
} from "lucide-react"
import { useRef } from "react"
import Link from 'next/link'
import { StockCard } from "@/components/StockCard"
import { NewsCard } from "@/components/NewsCard"

// Mock Data for Components
const MOCK_STOCK = {
    ticker: "NVDA",
    price: 887.45,
    change_percent: 4.5,
    volume: 32000000,
    sparkline: [820, 835, 840, 855, 850, 870, 880, 887.45],
}

const MOCK_NEWS = {
    id: "1",
    title: "Fed Signals Rate Cuts Remaining on Table for 2024",
    summary: "Federal Reserve officials indicated that inflation data is moving in the right direction, keeping hopes alive for rate cuts later this year.",
    source: "Bloomberg",
    link: "#",
    published_at: new Date().toISOString(),
    sentiment: 0.8,
    image_url: "https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=2664&auto=format&fit=crop"
}

export default function ProjectShowcase() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Hero Section */}
            <HeroSection />

            {/* Tech Stack */}
            <TechStackSection />

            {/* STAR Engineering Challenges (Vertical Scroll) */}
            <ChallengesSection />

            {/* Interactive Modules (Real Components) */}
            <InteractiveModulesSection />
        </div>
    )
}

function HeroSection() {
    return (
        <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950/80 to-slate-950 z-0" />
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="z-10 text-center space-y-8 px-4 max-w-5xl"
            >
                <div className="flex justify-center mb-6">
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 px-4 py-1.5 rounded-full text-sm backdrop-blur-md uppercase tracking-wider">
                        Full Stack AI Architecture
                    </Badge>
                </div>

                <h1 className="text-7xl md:text-9xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-600">
                    AI INVEST
                </h1>

                <p className="text-xl md:text-2xl text-slate-400 font-light leading-relaxed max-w-2xl mx-auto">
                    Redefining market analysis with <span className="text-indigo-400 font-medium">Context-Aware AI</span> and <span className="text-indigo-400 font-medium">Real-Time Data Pipelines</span>.
                </p>

                {/* Launch Button */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="pt-4"
                >
                    <Link href={process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || "#"} target="_blank">
                        <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-6 text-lg rounded-full shadow-[0_0_30px_-5px_theme(colors.indigo.500)] border border-indigo-400/30">
                            Launch App <Rocket className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>
                </motion.div>

                <div className="grid grid-cols-3 gap-8 pt-12 border-t border-slate-800/50 mt-12 w-full max-w-3xl mx-auto">
                    <StatItem value="99.9%" label="Uptime" />
                    <StatItem value="Gemini 1.5" label="Model" />
                    <StatItem value="Risk Free" label="Paper Trading" />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-10 z-10 animate-bounce"
            >
                <ChevronDown className="w-8 h-8 text-slate-600" />
            </motion.div>
        </section>
    )
}

function StatItem({ value, label }: { value: string, label: string }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <span className="text-2xl md:text-3xl font-bold text-white">{value}</span>
            <span className="text-xs text-slate-500 uppercase tracking-widest">{label}</span>
        </div>
    )
}

function TechStackSection() {
    return (
        <section className="py-24 bg-slate-900/20 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-6">
                <p className="text-center text-slate-500 text-sm uppercase tracking-widest mb-12">Powering Next-Gen Fintech</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 opacity-80">
                    <TechItem icon={<Globe />} title="Next.js 14" desc="App Router & SSR" />
                    <TechItem icon={<Server />} title="FastAPI" desc="High Performance Python" />
                    <TechItem icon={<Database />} title="PostgreSQL" desc="Async SQLAlchemy" />
                    <TechItem icon={<Cpu />} title="Google Gemini" desc="RAG & Context Injection" />
                </div>
            </div>
        </section>
    )
}

// Vertical Scrolling Challenges
const CHALLENGES = [
    {
        id: "01",
        title: "Context-Aware RAG Implementation",
        situation: "Standard LLMs like OpenAI or Gemini are cut off from real-time data, often hallucinating outdated market dates (e.g., thinking it's 2023).",
        task: "Create a mechanism to inject 'Right Now' context (Date, News) without retraining the model.",
        action: "Built a dynamic RAG pipeline in Python. Before every request, the backend fetches the latest 5 news summaries from PostgreSQL and injects a 'System Context' block containing Today's Date and News Headlines into the Gemini prompt.",
        result: "Eliminated temporal hallucinations. The AI now correctly identifies today's market events and correlates them with its internal knowledge base.",
        techs: ["Python", "Gemini API", "SQLAlchemy", "Prompt Engineering"],
        code: `
# app/api/assistant.py

# 1. Fetch Latest News for Context
context_str = f"Today's Date: {datetime.now().strftime('%Y-%m-%d')}\\n\\nLatest Market News:\\n"
result = await db.execute(select(models.News).order_by(models.News.published_at.desc()).limit(5))
news_items = result.scalars().all()

for n in news_items:
    context_str += f"- [{n.published_at}] {n.title} (Sentiment: {n.sentiment})\\n"

# 2. Enhanced Prompt with Context
system_instruction = f"""
You are an advanced AI Investment Assistant.
Context:
{context_str}

User Question: {user_input}
Please answer based on the provided latest market news and date.
"""
`
    },
    {
        id: "02",
        title: "Resilient News Crawler",
        situation: "Financial news sites (Reuters, CNBC) aggressively block automated scrapers, leading to 403 Forbidden errors and data gaps.",
        task: "Develop a stealthy crawler capable of mimicking human browsing behavior to ensure data continuity.",
        action: "Migrated from `requests` to `Playwright` for headless browser simulation. Implemented 'User-Agent Rotation' and exponential backoff retry logic using the `tenacity` library. Added a Redis-style caching layer.",
        result: "Successfully bypassed anti-bot protections, achieving 99% scrape success rate with hourly updates.",
        techs: ["Playwright", "AsyncIO", "Tenacity", "Headless Chrome"],
        code: `
# app/services/crawler.py

async def fetch_rss_xml(client, url):
    # Use HTTPX for fast RSS polling first
    headers = { "User-Agent": "Mozilla/5.0..." }
    response = await client.get(url, follow_redirects=True)
    return response.text

async def fetch_full_content(page, url):
    # Fallback to Playwright for full JS rendering if needed
    try:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        content = await page.content()
        return clean_html_static(content)
    except Exception as e:
        log_debug(f"Playwright error for {url}: {e}")
`
    },
    {
        id: "03",
        title: "Zero-Downtime Infrastructure",
        situation: "The free-tier hosting provider (Render) would put the app to sleep after inactivity, and long-running crawler tasks caused Worker Timeouts.",
        task: "Ensure 24/7 availability and decouple heavy compute tasks from the main API thread.",
        action: "1. Implemented a `/health` endpoint for external monitoring (UptimeRobot). 2. Offloaded crawler jobs to `APScheduler` background threads. 3. Optimized Dockerfile build to reduce startup time.",
        result: "Service stays awake 24/7. Background tasks run asynchronously without blocking the main API thread, preventing Worker Timeouts.",
        techs: ["Docker", "UptimeRobot", "APScheduler", "Health Checks"],
        code: `
# app/main.py

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Schedule Background Tasks
    scheduler.add_job(scheduled_news_crawl, 'interval', minutes=60)
    scheduler.start()
    yield
    # Shutdown
    scheduler.shutdown()

@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    # Pinged by UptimeRobot every 5 mins
    return {"status": "alive"}
`
    }
]

function ChallengesSection() {
    return (
        <section className="py-32 px-6 max-w-7xl mx-auto space-y-32">
            <div className="text-center mb-24">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">Engineering Challenges</h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    A transparent look at technical hurdles using the STAR methodology.
                </p>
            </div>

            {CHALLENGES.map((challenge, index) => (
                <ChallengeRow key={challenge.id} data={challenge} index={index} />
            ))}
        </section>
    )
}

function ChallengeRow({ data, index }: { data: any, index: number }) {
    const isEven = index % 2 === 0
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ margin: "-10% 0px -10% 0px", once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-16 items-start`}
        >
            {/* Text Side */}
            <div className="flex-1 space-y-8 sticky top-32">
                <div>
                    <span className="text-indigo-500 font-mono text-sm tracking-wider">CHALLENGE #{data.id}</span>
                    <h3 className="text-4xl font-bold mt-2 mb-6 text-white leading-tight">{data.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-8">
                        {data.techs.map((t: string) => (
                            <Badge key={t} variant="secondary" className="bg-slate-800 text-slate-400 border border-slate-700">{t}</Badge>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <StarBox icon={<TriangleAlert className="text-amber-500" />} label="Situation" text={data.situation} delay={0.1} />
                    <StarBox icon={<CheckCircle className="text-blue-500" />} label="Task" text={data.task} delay={0.2} />
                </div>
            </div>

            {/* Action/Result Side (Visuals) */}
            <div className="flex-1 space-y-6 w-full">
                <StarBox icon={<Code className="text-purple-500" />} label="Action" text={data.action} className="bg-slate-900/80 border-indigo-500/30" delay={0.3} />
                <StarBox icon={<TrendingUp className="text-green-500" />} label="Result" text={data.result} className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border-green-500/20" delay={0.4} />

                {/* Real Code Snippet */}
                <div className="w-full rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <span className="text-xs font-mono text-slate-500 ml-2">source_code.py</span>
                    </div>
                    <div className="p-4 overflow-x-auto">
                        <pre className="font-mono text-xs text-slate-300 leading-relaxed">
                            <code>{data.code}</code>
                        </pre>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

function StarBox({ icon, label, text, className = "", delay = 0 }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            className={`p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors ${className}`}
        >
            <div className="flex items-center gap-3 mb-4 font-bold text-slate-200 text-lg">
                {icon} {label}
            </div>
            <p className="text-slate-400 leading-relaxed text-base">{text}</p>
        </motion.div>
    )
}

// Interactive Modules with Real Components
function InteractiveModulesSection() {
    return (
        <section className="py-32 bg-slate-950 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-20">
                    <h2 className="text-4xl font-bold mb-4">Interactive Modules</h2>
                    <p className="text-slate-500">Live components from the actual production build</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Module 1: Market Data */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Activity /></div>
                            <h3 className="font-bold text-xl">Real-Time Market Data</h3>
                        </div>
                        <div className="transform hover:scale-105 transition-transform duration-500">
                            <StockCard quote={MOCK_STOCK} isSaved={true} onToggleWatchlist={() => { }} />
                        </div>
                        <p className="text-sm text-slate-500 px-2">
                            Live stock ticker component with Recharts sparklines and dynamic coloring based on daily change.
                        </p>
                    </div>

                    {/* Module 2: News Sentiment */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><Globe /></div>
                            <h3 className="font-bold text-xl">AI News Sentiment</h3>
                        </div>
                        <div className="transform hover:scale-105 transition-transform duration-500 h-full max-h-[400px]">
                            <NewsCard news={MOCK_NEWS} />
                        </div>
                        <p className="text-sm text-slate-500 px-2">
                            News feed card featuring automated sentiment analysis (0-100 score) and source tracking.
                        </p>
                    </div>

                    {/* Module 3: Backtesting Logic (Visual Mock) */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><LineChart /></div>
                            <h3 className="font-bold text-xl">Backtesting Engine</h3>
                        </div>
                        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 h-[220px] flex flex-col justify-between hover:border-purple-500/50 transition-colors group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-2xl font-bold text-white mb-1">+24.5%</div>
                                    <div className="text-xs text-green-400">Annual Return</div>
                                </div>
                                <Activity className="text-purple-500 group-hover:animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 w-[70%]" />
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-[45%]" />
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 pt-2">
                                    <span>Strategy A</span>
                                    <span>Sharpe: 1.8</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 px-2">
                            Visual representation of the backtesting strategy performance and equity curve.
                        </p>
                    </div>
                </div>
            </div>
        </section>
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
