"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Star } from "lucide-react"
import axios from "axios"
import { auth, watchlist } from "@/lib/auth"
import Link from 'next/link'
import { useToast } from "@/components/ui/use-toast"
import { StockCard, StockQuote } from "@/components/StockCard"
import { Separator } from "@/components/ui/separator"

export default function StockDashboard() {
    const [input, setInput] = useState("")
    const [searchQuotes, setSearchQuotes] = useState<StockQuote[]>([])
    const [watchlistQuotes, setWatchlistQuotes] = useState<StockQuote[]>([])
    const [loading, setLoading] = useState(false)
    const [savedTickers, setSavedTickers] = useState<string[]>([])
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const { toast } = useToast()

    const fetchQuotesData = async (tickerString: string): Promise<StockQuote[]> => {
        if (!tickerString) return []
        try {
            const tickers = tickerString.split(',').map(t => t.trim()).filter(t => t).join(',')
            if (!tickers) return []
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
            const res = await axios.get(`${API_URL}/stocks/quotes?tickers=${tickers}`)
            if (Array.isArray(res.data)) {
                return res.data
            }
            return []
        } catch (e) {
            console.error(e)
            return []
        }
    }

    // Load Watchlist & Auth status on mount
    useEffect(() => {
        const checkAuth = async () => {
            const isAuth = auth.isAuthenticated()
            setIsAuthenticated(isAuth)

            // Initial load for Search Section (Recommendations)
            setLoading(true)
            const initialRecs = await fetchQuotesData("AAPL, TSLA, NVDA")
            setSearchQuotes(initialRecs)
            setLoading(false)

            if (isAuth) {
                try {
                    const list = await watchlist.get()
                    setSavedTickers(list)
                } catch (e) {
                    console.error("Failed to load watchlist", e)
                }
            }
        }
        checkAuth()
    }, [])

    // Effect: Whenever savedTickers changes, update watchlistQuotes
    // We only fetch if we don't have the data or if it might be stale.
    // For simplicity, we fetch fresh data for the watchlist to ensure accuracy.
    useEffect(() => {
        const updateWatchlistData = async () => {
            if (savedTickers.length === 0) {
                setWatchlistQuotes([])
                return
            }
            // Optimization: We could filter out ones we already have data for in searchQuotes?
            // But let's keep it simple and safe for now: just fetch.
            const data = await fetchQuotesData(savedTickers.join(','))
            setWatchlistQuotes(data)
        }
        if (isAuthenticated) {
            updateWatchlistData()
        }
    }, [savedTickers, isAuthenticated])


    const handleSearch = async () => {
        setLoading(true)
        const data = await fetchQuotesData(input)
        setSearchQuotes(data)
        setLoading(false)
    }

    const toggleWatchlist = async (ticker: string) => {
        if (!isAuthenticated) {
            toast({
                variant: "destructive",
                title: "Authentication Required",
                description: "Please login to track your favorite stocks.",
            })
            return
        }

        const isSaved = savedTickers.includes(ticker)

        // Optimistic Strings Update
        const optimisticList = isSaved
            ? savedTickers.filter(t => t !== ticker)
            : [...savedTickers, ticker]

        setSavedTickers(optimisticList)

        // Optimistic Quotes Update (Visual)
        if (isSaved) {
            setWatchlistQuotes(prev => prev.filter(q => q.ticker !== ticker))
        } else {
            // Try to find the data in searchQuotes to add instantly
            const quoteToAdd = searchQuotes.find(q => q.ticker === ticker)
            if (quoteToAdd) {
                setWatchlistQuotes(prev => [...prev, quoteToAdd])
            }
            // If not found (rare), the useEffect [savedTickers] will catch up shortly by fetching
        }

        try {
            if (isSaved) {
                await watchlist.remove(ticker)
                toast({ description: `Removed ${ticker} from watchlist` })
            } else {
                await watchlist.add(ticker)
                toast({ description: `Added ${ticker} to watchlist` })
            }
        } catch (e) {
            console.error("Watchlist update failed", e)
            setSavedTickers(savedTickers) // Revert strings
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update watchlist. Please try again."
            })
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Stock Dashboard</h1>
                        <p className="text-muted-foreground">Real-time quotes and market trends.</p>
                    </div>
                    {!isAuthenticated && (
                        <div className="text-sm">
                            <Link href="/login" className="text-blue-500 hover:underline mr-4">Login</Link>
                            <Link href="/register" className="text-blue-500 hover:underline">Register</Link>
                        </div>
                    )}
                    {isAuthenticated && (
                        <div className="text-sm text-muted-foreground">
                            Logged in. <button onClick={auth.logout} className="text-blue-500 hover:underline ml-2">Logout</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-end gap-4 max-w-xl">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <label htmlFor="ticker" className="text-sm font-medium leading-none">Find Symbols</label>
                    <Input
                        id="ticker"
                        placeholder="e.g. MSFT, 0050.TW"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-[320px]"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button size="icon" onClick={handleSearch} disabled={loading}>
                    <Search className="h-4 w-4" />
                </Button>
            </div>

            {/* --- SECTION 1: SEARCH & RECOMMENDATIONS --- */}
            <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Search & Discover
                </h2>
                {loading && <div className="text-sm text-muted-foreground animate-pulse mb-4">Loading quotes...</div>}

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {searchQuotes.map((quote) => (
                        <StockCard
                            key={quote.ticker}
                            quote={quote}
                            isSaved={savedTickers.includes(quote.ticker)}
                            onToggleWatchlist={toggleWatchlist}
                        />
                    ))}
                </div>
                {searchQuotes.length === 0 && !loading && (
                    <div className="text-muted-foreground italic text-sm">
                        No results found. Try searching for a ticker symbol.
                    </div>
                )}
            </div>

            <Separator className="my-8" />

            {/* --- SECTION 2: MY WATCHLIST --- */}
            {isAuthenticated ? (
                <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        My Watchlist
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {watchlistQuotes.map((quote) => (
                            <StockCard
                                key={`wl-${quote.ticker}`}
                                quote={quote}
                                isSaved={savedTickers.includes(quote.ticker)}
                                onToggleWatchlist={toggleWatchlist}
                            />
                        ))}
                    </div>
                    {watchlistQuotes.length === 0 && (
                        <div className="text-muted-foreground italic text-sm py-4">
                            Your watchlist is empty. Add stocks from the search section above!
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-8 bg-muted/20 rounded-lg text-center border border-dashed">
                    <h3 className="text-lg font-medium mb-2">Login to see your Watchlist</h3>
                    <p className="text-muted-foreground mb-4">Track your favorite stocks and see them here every time you visit.</p>
                    <Link href="/login">
                        <Button variant="outline">Login Now</Button>
                    </Link>
                </div>
            )}
        </div>
    )
}
