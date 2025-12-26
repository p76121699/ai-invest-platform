import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, Activity, TrendingUp, TrendingDown, X, Bell, Star, AlertCircle } from "lucide-react"
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    YAxis,
    Tooltip,
    LineChart,
    Line,
    XAxis,
    CartesianGrid,
    Legend
} from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import axios from "axios"
import { API_URL } from "@/lib/auth"

export interface StockQuote {
    ticker: string
    price: number
    change_percent: number
    volume: number
    sparkline: number[]
    error?: string
}

interface StockCardProps {
    quote: StockQuote
    isSaved: boolean
    onToggleWatchlist: (ticker: string) => void
}

export function StockCard({ quote, isSaved, onToggleWatchlist }: StockCardProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Card
                className="overflow-hidden relative group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border-l-4"
                style={{ borderLeftColor: quote.change_percent >= 0 ? '#22c55e' : '#ef4444' }}
                onClick={() => setOpen(true)}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex flex-col">
                        <CardTitle className="text-xl font-bold">{quote.ticker}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">Real-time Quote</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 z-10 relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleWatchlist(quote.ticker);
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
                        >
                            <Star
                                className={`h-5 w-5 transition-colors duration-200 ${isSaved ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`}
                            />
                        </button>

                        {quote.error ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : quote.change_percent >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {quote.error ? (
                        <div className="text-sm text-red-500 py-4">{quote.error}</div>
                    ) : (
                        <>
                            <div className="text-2xl font-bold">
                                ${quote.price.toFixed(2)}
                            </div>
                            <p className={`text-xs ${quote.change_percent >= 0 ? "text-green-500" : "text-red-500"}`}>
                                {quote.change_percent > 0 ? "+" : ""}{quote.change_percent}%
                            </p>

                            <div className="h-[60px] w-full mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={quote.sparkline.map((v, i) => ({ i, v }))}>
                                        <defs>
                                            <linearGradient id={`gradient-${quote.ticker}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={quote.change_percent >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={quote.change_percent >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <YAxis domain={['auto', 'auto']} hide />
                                        <Area
                                            type="monotone"
                                            dataKey="v"
                                            stroke={quote.change_percent >= 0 ? "#22c55e" : "#ef4444"}
                                            fillOpacity={1}
                                            fill={`url(#gradient-${quote.ticker})`}
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <StockDetailDialog open={open} onOpenChange={setOpen} ticker={quote.ticker} />
        </>
    )
}

function StockDetailDialog({ open, onOpenChange, ticker }: { open: boolean, onOpenChange: (v: boolean) => void, ticker: string }) {
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [indicators, setIndicators] = useState({
        ma20: true,
        ma50: false,
        rsi: false
    })

    useEffect(() => {
        if (open && ticker) {
            setLoading(true)
            axios.get(`${API_URL}/stocks/history?ticker=${ticker}&period=1y`)
                .then(res => {
                    setHistory(res.data.history)
                })
                .catch(e => console.error(e))
                .finally(() => setLoading(false))
        }
    }, [open, ticker])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col bg-slate-950 text-slate-100 border-slate-800">
                <DialogHeader className="border-b border-slate-800 pb-4">
                    <DialogTitle className="text-3xl flex items-center gap-3">
                        {ticker}
                        <span className="text-2xl text-slate-400 font-light">Technical Analysis</span>
                        {loading && <span className="text-sm font-normal text-muted-foreground animate-pulse ml-auto">Updating data...</span>}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Detailed market analysis and technical indicators for {ticker}.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex flex-col gap-4 min-h-0 pt-4">
                    {/* Controls */}
                    <div className="flex gap-6 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="ma20" checked={indicators.ma20} onCheckedChange={(c: boolean) => setIndicators(prev => ({ ...prev, ma20: !!c }))} className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
                            <Label htmlFor="ma20" className="text-slate-300">SMA 20 (Amber)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="ma50" checked={indicators.ma50} onCheckedChange={(c: boolean) => setIndicators(prev => ({ ...prev, ma50: !!c }))} className="border-slate-600 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500" />
                            <Label htmlFor="ma50" className="text-slate-300">SMA 50 (Purple)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="rsi" checked={indicators.rsi} onCheckedChange={(c: boolean) => setIndicators(prev => ({ ...prev, rsi: !!c }))} className="border-slate-600 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" />
                            <Label htmlFor="rsi" className="text-slate-300">RSI (Red Overlay)</Label>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="flex-1 min-h-0 relative">
                        {history.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.05} vertical={false} />
                                    <XAxis
                                        dataKey="Date"
                                        tickFormatter={(d) => d.slice(5)}
                                        stroke="#475569"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        domain={['auto', 'auto']}
                                        yAxisId="price"
                                        stroke="#475569"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `$${v}`}
                                    />
                                    {indicators.rsi && <YAxis yAxisId="rsi" orientation="right" domain={[0, 100]} stroke="#ef4444" opacity={0.5} fontSize={10} axisLine={false} tickLine={false} />}

                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                                        cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        formatter={(value: any) => typeof value === 'number' ? value.toFixed(3) : value}
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" />

                                    <Line
                                        yAxisId="price"
                                        type="monotone"
                                        dataKey="Close"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={false}
                                        name="Close Price"
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa' }}
                                    />

                                    {indicators.ma20 && <Line yAxisId="price" type="monotone" dataKey="ma20" stroke="#f59e0b" strokeWidth={2} dot={false} name="SMA 20" strokeDasharray="5 5" />}
                                    {indicators.ma50 && <Line yAxisId="price" type="monotone" dataKey="ma50" stroke="#8b5cf6" strokeWidth={2} dot={false} name="SMA 50" strokeDasharray="5 5" />}

                                    {indicators.rsi && <Line yAxisId="rsi" type="monotone" dataKey="rsi" stroke="#ef4444" strokeWidth={1} dot={false} name="RSI (14)" opacity={0.4} />}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">
                                {loading ? "Analyzing market data..." : "No Data Available"}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
