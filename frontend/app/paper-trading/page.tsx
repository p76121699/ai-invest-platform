"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import axios from "axios"
import { API_URL } from "@/lib/auth"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Trash, TrendingUp, TrendingDown, DollarSign, Wallet, Briefcase } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCcw } from "lucide-react"
import { StockCard } from "@/components/StockCard"

// Types
interface Trade {
    id: string
    ticker: string
    action: "buy" | "sell"
    price: number
    shares: number
    date: string
    execution_date?: string
}

interface Holding {
    ticker: string
    shares: number
    avgCost: number
    marketPrice: number // Mock for now
    totalValue: number
    unrealizedPL: number
    unrealizedPLPct: number
}

export default function PaperTradingPage() {
    const [trades, setTrades] = useState<Trade[]>([])
    const [holdings, setHoldings] = useState<Holding[]>([])
    const [cash, setCash] = useState(100000) // Mock starting cash
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    // Form State
    const [formTicker, setFormTicker] = useState("")
    const [formAction, setFormAction] = useState<"buy" | "sell">("buy")
    const [formPrice, setFormPrice] = useState("")
    const [formShares, setFormShares] = useState("")
    const [previewPrice, setPreviewPrice] = useState<number | null>(null)
    const [previewChange, setPreviewChange] = useState<number | null>(null)
    const [previewQuote, setPreviewQuote] = useState<any>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Load Trades
    useEffect(() => {
        fetchTrades()
    }, [])

    // Recalculate Holdings whenever Trades change
    useEffect(() => {
        calculateHoldings(trades)
    }, [trades])

    const fetchTrades = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) return
            const res = await axios.get(`${API_URL}/portfolio`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            // Sort by date desc
            const sorted = res.data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            setTrades(sorted)
        } catch (e) {
            console.error("Failed to fetch portfolio", e)
        } finally {
            setLoading(false)
        }
    }

    const calculateHoldings = (tradeList: Trade[]) => {
        const map = new Map<string, { shares: number, totalCost: number }>()
        let currentCash = 100000

        // Process in chronological order for accurate cash/cost basis
        // Make a copy and sort ASCENDING for calculation
        const chronologicalTrades = [...tradeList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        chronologicalTrades.forEach(t => {
            const cost = t.price * t.shares
            if (t.action.toLowerCase() === 'buy') {
                currentCash -= cost
                const existing = map.get(t.ticker) || { shares: 0, totalCost: 0 }
                existing.shares += t.shares
                existing.totalCost += cost
                map.set(t.ticker, existing)
            } else if (t.action.toLowerCase() === 'sell') {
                currentCash += cost
                const existing = map.get(t.ticker)
                if (existing) {
                    // FIFOish reduction of cost basis? Or Avg Cost?
                    // Simple Avg Cost implementation: Reduce cost proportionally
                    const avgCostPerShare = existing.totalCost / existing.shares
                    existing.shares -= t.shares
                    existing.totalCost -= (avgCostPerShare * t.shares)
                    if (existing.shares <= 0) map.delete(t.ticker)
                    else map.set(t.ticker, existing)
                }
            }
        })

        setCash(currentCash)

        // Transform to Array and Mock Market Price (Random fluctuation from avg cost)
        // In real app, we would fetch live prices here
        const computedHoldings: Holding[] = Array.from(map.entries()).map(([ticker, data]) => {
            const avgCost = data.totalCost / data.shares
            // Mock market price: random +/- 5% of avg cost
            // Ensure stable random per ticker per session? No, just random for MVP demo
            // Actually, let's just use the LAST trade price as current price if available, else avgCost
            const lastTrade = tradeList.find(t => t.ticker === ticker)
            const marketPrice = lastTrade ? lastTrade.price : avgCost

            const totalValue = data.shares * marketPrice
            const pl = totalValue - data.totalCost

            return {
                ticker,
                shares: data.shares,
                avgCost,
                marketPrice,
                totalValue,
                unrealizedPL: pl,
                unrealizedPLPct: (pl / data.totalCost) * 100
            }
        })

        setHoldings(computedHoldings)
    }

    const handleDelete = async (id: string) => {
        try {
            const token = localStorage.getItem('token')
            await axios.delete(`${API_URL}/portfolio/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast({ title: "Trade Removed" })
            fetchTrades()
        } catch (e) {
            toast({ variant: "destructive", title: "Failed to remove" })
        }
    }



    const handleReset = async () => {
        // Removed window.confirm for frictionless experience as requested
        // in a simulation environment, quick reset is often desired.
        try {
            const token = localStorage.getItem('token')
            await axios.delete(`${API_URL}/portfolio/reset`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast({ title: "Portfolio Reset", description: "All trades cleared." })
            setTrades([])
            setHoldings([])
            setCash(100000)
            setPreviewQuote(null) // Ensure card is gone too
        } catch (e) {
            toast({ variant: "destructive", title: "Failed to reset" })
        }
    }

    const handleTickerChange = (val: string) => {
        const upVal = val.toUpperCase()
        setFormTicker(upVal)
        if (!upVal) {
            setPreviewPrice(null)
            setPreviewChange(null)
            setPreviewQuote(null)
            setFormPrice("")
        }
    }

    const handleTickerBlur = async () => {
        if (!formTicker) return
        try {
            // Fetch quote to show preview
            const token = localStorage.getItem('token')
            const res = await axios.get(`${API_URL}/stocks/quote?ticker=${formTicker.toUpperCase()}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            // API returns StockQuote object { ticker, price, ... }
            if (res.data && res.data.price) {
                setPreviewPrice(res.data.price)
                setPreviewQuote(res.data)

                // Add trend info if available
                if (res.data.change_percent !== undefined) setPreviewChange(res.data.change_percent)

                if (!formPrice) {
                    setFormPrice(res.data.price.toFixed(2))
                }
            }

        } catch (e) {
            console.log("Failed to fetch price preview")
        }
    }

    const handleSubmitOrder = async () => {
        if (!formTicker || !formPrice || !formShares) {
            toast({ variant: "destructive", title: "Missing Fields", description: "Please fill all fields." })
            return
        }

        // Short Selling Check
        if (formAction === 'sell') {
            const holding = holdings.find(h => h.ticker === formTicker.toUpperCase())
            const currentShares = holding ? holding.shares : 0
            if (currentShares < parseFloat(formShares)) {
                toast({ variant: "destructive", title: "Invalid Sell Order", description: `You only have ${currentShares} shares.` })
                return
            }
        }

        try {
            const token = localStorage.getItem('token')
            const payload = {
                ticker: formTicker.toUpperCase(),
                action: formAction,
                price: parseFloat(formPrice),
                shares: parseFloat(formShares),
                date: new Date().toISOString()
            }

            await axios.post(`${API_URL}/portfolio`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            })

            toast({ title: "Order Executed", description: `${formAction.toUpperCase()} ${formTicker} successful.` })
            setIsDialogOpen(false)
            setFormTicker("")
            setFormPrice("")
            setFormShares("")
            fetchTrades()
        } catch (e) {
            toast({ variant: "destructive", title: "Order Failed" })
        }
    }

    const totalEquity = cash + holdings.reduce((sum, h) => sum + h.totalValue, 0)
    const totalPL = totalEquity - 100000

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Paper Trading</h1>
                    <p className="text-muted-foreground">Manage your virtual portfolio.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> New Order
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Place Order</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Action</Label>
                                            <Select value={formAction} onValueChange={(v: "buy" | "sell") => setFormAction(v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="buy">BUY</SelectItem>
                                                    <SelectItem value="sell">SELL</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ticker</Label>
                                            <Input
                                                value={formTicker}
                                                onChange={(e) => handleTickerChange(e.target.value)}
                                                onBlur={handleTickerBlur}
                                                placeholder="e.g. NVDA"
                                            />
                                            {previewPrice && (
                                                <div className="text-xs mt-1 flex gap-2">
                                                    <span className="text-muted-foreground">Last: ${previewPrice.toFixed(2)}</span>
                                                    {previewChange !== null && (
                                                        <span className={previewChange >= 0 ? "text-green-500" : "text-red-500"}>
                                                            {previewChange >= 0 ? "+" : ""}{previewChange.toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Shares</Label>
                                            <Input type="number" value={formShares} onChange={(e) => setFormShares(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Price</Label>
                                            <Input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} />
                                        </div>
                                    </div>
                                    <Button onClick={handleSubmitOrder} className="w-full mt-4">Submit Order</Button>

                                </div>

                                {/* Right Column: Stock Card Preview */}
                                <div>
                                    {previewQuote ? (
                                        <div className="transform scale-90 origin-top-left w-full h-full">
                                            <Label className="mb-2 block text-muted-foreground">Preview</Label>
                                            <StockCard
                                                quote={previewQuote}
                                                isSaved={false}
                                                onToggleWatchlist={() => { }}
                                            />
                                            <div className="mt-4 text-xs text-muted-foreground">
                                                * This data is real-time. Chart is mock/sparkline.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border border-dashed rounded-lg h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                                            <p>Enter a ticker (e.g. NVDA)</p>
                                            <p className="text-xs mt-2">to see real-time quote</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button variant="destructive" size="icon" onClick={handleReset} title="Reset Portfolio">
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground">Cash + Holdings</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground">Buying Power</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                        {totalPL >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totalPL >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {totalPL >= 0 ? "+" : ""}{totalPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-xs text-muted-foreground">All time return</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{holdings.length}</div>
                        <p className="text-xs text-muted-foreground">Open trades</p>
                    </CardContent>
                </Card>
            </div>

            {/* Holdings Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                    {!loading && holdings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No active positions</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ticker</TableHead>
                                    <TableHead className="text-right">Shares</TableHead>
                                    <TableHead className="text-right">Avg Cost</TableHead>
                                    <TableHead className="text-right">Mkt Price</TableHead>
                                    <TableHead className="text-right">Market Value</TableHead>
                                    <TableHead className="text-right">Unrealized P&L</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {holdings.map((h) => (
                                    <TableRow key={h.ticker}>
                                        <TableCell className="font-medium">{h.ticker}</TableCell>
                                        <TableCell className="text-right">{h.shares}</TableCell>
                                        <TableCell className="text-right">${h.avgCost.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">${h.marketPrice.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold">${h.totalValue.toLocaleString()}</TableCell>
                                        <TableCell className={`text-right font-bold ${h.unrealizedPL >= 0 ? "text-green-500" : "text-red-500"}`}>
                                            {h.unrealizedPL >= 0 ? "+" : ""}{h.unrealizedPL.toFixed(2)} ({h.unrealizedPLPct.toFixed(1)}%)
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Transaction History (Moved from Dashboard) */}
            <Card>
                <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Ticker</TableHead>
                                <TableHead>Shares</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {trades.slice(0, 10).map((trade, i) => (
                                <TableRow key={i}>
                                    <TableCell className="text-muted-foreground text-xs">{new Date(trade.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="uppercase font-bold text-xs">{trade.action}</TableCell>
                                    <TableCell>{trade.ticker}</TableCell>
                                    <TableCell>{trade.shares}</TableCell>
                                    <TableCell>${trade.price}</TableCell>
                                    <TableCell className="text-right">${(trade.shares * trade.price).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(trade.id)}>
                                            <Trash className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
