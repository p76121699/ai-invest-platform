"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts"
import { Info } from "lucide-react"
import axios from "axios"
import { API_URL } from "@/lib/auth"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export default function BacktestPage() {
    const [params, setParams] = useState({
        ticker: "AAPL",
        strategy: "ma_crossover",
        fast_ma: 10,
        slow_ma: 30,
        rsi_period: 14,
        rsi_lower: 30,
        rsi_upper: 70,
        start: "2023-01-01",
        end: "2024-01-01"
    })
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    // Load params from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("backtest_params")
        if (saved) {
            try {
                setParams(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse saved parameters")
            }
        }
    }, [])

    // Save params to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("backtest_params", JSON.stringify(params))
    }, [params])

    const handleRun = async () => {
        setLoading(true)
        // Validation
        if (!params.ticker) {
            toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid ticker symbol." })
            setLoading(false)
            return
        }
        if (new Date(params.start) >= new Date(params.end)) {
            toast({ variant: "destructive", title: "Invalid Date Range", description: "Start date must be before end date." })
            setLoading(false)
            return
        }
        if (params.strategy === "ma_crossover" && params.fast_ma >= params.slow_ma) {
            toast({ variant: "destructive", title: "Invalid Strategy", description: "Fast MA must be smaller than Slow MA." })
            setLoading(false)
            return
        }

        try {
            // Map frontend params to API schema
            const payload = {
                ticker: params.ticker,
                strategy: params.strategy,
                fast_ma: params.fast_ma,
                slow_ma: params.slow_ma,
                rsi_period: params.rsi_period,
                rsi_lower: params.rsi_lower,
                rsi_upper: params.rsi_upper,
                start: params.start,
                end: params.end
            }
            const res = await axios.post(`${API_URL}/backtest/run`, payload)
            setResult(res.data)
            toast({ title: "Backtest Complete", description: `Simulation finished for ${params.ticker}` })
        } catch (e) {
            toast({ variant: "destructive", title: "Simulation Failed", description: "Please check your inputs and try again." })
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    // Transform equity curve for Chart (Array of floats -> Array of Objects)
    const chartData = result?.equity_curve?.map((val: number, index: number) => ({
        day: index,
        equity: val
    })) || []

    // Stats
    const stats = result?.stats || {}
    const finalEquity = result?.equity_curve ? result.equity_curve[result.equity_curve.length - 1] : 0

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Strategy Backtester</h1>
                <p className="text-muted-foreground">Test trading strategies on historical data.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Controls */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Strategy Parameters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Ticker Symbol</Label>
                            <Input
                                value={params.ticker}
                                onChange={(e) => setParams({ ...params, ticker: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Strategy</Label>
                            <Select value={params.strategy} onValueChange={(v) => setParams({ ...params, strategy: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ma_crossover">MA Crossover</SelectItem>
                                    <SelectItem value="rsi_reversal">RSI Reversal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {params.strategy === "ma_crossover" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fast MA</Label>
                                    <Input
                                        type="number"
                                        value={params.fast_ma}
                                        onChange={(e) => setParams({ ...params, fast_ma: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Slow MA</Label>
                                    <Input
                                        type="number"
                                        value={params.slow_ma}
                                        onChange={(e) => setParams({ ...params, slow_ma: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        )}

                        {params.strategy === "rsi_reversal" && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>RSI Period</Label>
                                    <Input
                                        type="number"
                                        value={params.rsi_period}
                                        onChange={(e) => setParams({ ...params, rsi_period: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Lower (Buy)</Label>
                                        <Input
                                            type="number"
                                            value={params.rsi_lower}
                                            onChange={(e) => setParams({ ...params, rsi_lower: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Upper (Sell)</Label>
                                        <Input
                                            type="number"
                                            value={params.rsi_upper}
                                            onChange={(e) => setParams({ ...params, rsi_upper: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                                type="date"
                                value={params.start}
                                onChange={(e) => setParams({ ...params, start: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                                type="date"
                                value={params.end}
                                onChange={(e) => setParams({ ...params, end: e.target.value })}
                            />
                        </div>
                        <Button className="w-full mt-4" onClick={handleRun} disabled={loading}>
                            {loading ? "Running Simulation..." : "Run Backtest"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Right Column: Results */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <TooltipProvider>
                            <StatCard
                                label="Final Equity"
                                value={result ? finalEquity.toFixed(2) : "-"}
                                tooltip="The ending balance of your portfolio after the backtest."
                            />
                            <StatCard
                                label="Total Return"
                                value={result ? `${(stats.total_return * 100).toFixed(1)}% ` : "-"}
                                tooltip="The total percentage gain or loss over the period."
                            />
                            <StatCard
                                label="Max Drawdown"
                                value={result ? `${(stats.max_drawdown * 100).toFixed(1)}% ` : "-"}
                                tooltip="The largest single drop from peak to bottom in the portfolio value."
                            />
                            <StatCard
                                label="Sharpe Ratio"
                                value={result ? stats.sharpe.toFixed(2) : "-"}
                                tooltip="Risk-adjusted return. >1 is good, >2 is excellent."
                            />
                        </TooltipProvider>
                    </div>

                    {/* Equity Curve */}
                    <Card>
                        <CardHeader><CardTitle>Equity Curve</CardTitle></CardHeader>
                        <CardContent className="h-[300px]">
                            {result ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day" />
                                        <YAxis domain={['auto', 'auto']} />
                                        <ChartTooltip formatter={(value: any) => typeof value === 'number' ? value.toFixed(3) : value} />
                                        <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground">
                                    Run a backtest to see results
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Trades Table */}
                    <Card>
                        <CardHeader><CardTitle>Recent Trades</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Signal Date</TableHead>
                                        <TableHead>Exec Date</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Price (Open)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {result?.trades?.map((trade: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell className="text-muted-foreground text-xs">{trade.date}</TableCell>
                                            <TableCell>{trade.execution_date}</TableCell>
                                            <TableCell className={trade.action === "buy" ? "text-green-500 font-bold uppercase" : "text-red-500 font-bold uppercase"}>
                                                {trade.action}
                                            </TableCell>
                                            <TableCell>${trade.price}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, tooltip }: { label: string, value: string, tooltip: string }) {
    return (
        <Card className="overflow-hidden">
            <div className="bg-muted/50 p-2 border-b flex items-center justify-center gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{label}</span>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-3 w-3 cursor-help text-muted-foreground hover:text-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-[200px] text-xs">{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <div className="p-4 flex items-center justify-center bg-card">
                <span className="text-xl md:text-2xl font-bold tracking-tight">{value}</span>
            </div>
        </Card>
    )
}
