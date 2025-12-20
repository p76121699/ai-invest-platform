"use client"

import { useEffect, useState } from "react"
import { NewsCard } from "@/components/NewsCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import axios from "axios"
import { auth, watchlist, API_URL } from "@/lib/auth"
import { Separator } from "@/components/ui/separator"
import { Flame, Newspaper } from "lucide-react"

// Define types locally or import from a shared types file
interface NewsItem {
    id: string
    title: string
    summary: string
    source: string
    link: string
    published_at: string
    sentiment: number
    image_url?: string
}

export default function NewsPage() {
    const [news, setNews] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [savedTickers, setSavedTickers] = useState<string[]>([])
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const limit = 30

    const fetchNews = async (reset = false) => {
        if (reset) {
            setLoading(true)
            setPage(0)
            setHasMore(true)
        } else {
            setLoadingMore(true)
        }

        try {
            const currentSkip = reset ? 0 : page * limit
            // Use limit+1 to peek if there's more
            const res = await axios.get(`${API_URL}/news?limit=${limit}&skip=${currentSkip}`)

            let newItems: NewsItem[] = []
            if (Array.isArray(res.data)) {
                newItems = res.data
            } else if (res.data && res.data.news) {
                newItems = res.data.news
            }

            if (newItems.length < limit) {
                setHasMore(false)
            }

            if (reset) {
                setNews(newItems)
                setPage(1)
            } else {
                // Filter duplicates just in case
                setNews(prev => {
                    const existingIds = new Set(prev.map(i => i.id))
                    const filtered = newItems.filter(i => !existingIds.has(i.id))
                    return [...prev, ...filtered]
                })
                setPage(prev => prev + 1)
            }

        } catch (error) {
            console.error("Failed to fetch news", error)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const fetchWatchlist = async () => {
        if (auth.isAuthenticated()) {
            try {
                const list = await watchlist.get()
                setSavedTickers(list)
            } catch (e) {
                console.error("Failed to load watchlist", e)
            }
        }
    }

    // Add import at top manually via multi_replace if needed, or assume it's there
    // Actually replace_file_content handles one block. I need to handle imports too.
    // Let's use multi_replace for this file to ensure import is added.
    const refreshNews = async () => {
        try {
            await axios.post(`${API_URL}/news/refresh`)
            fetchNews(true)
        } catch (error) {
            console.error("Failed to refresh news", error)
        }
    }

    // Initial Load
    useEffect(() => {
        fetchNews(true)
        fetchWatchlist()
    }, [])

    // Infinite Scroll Handler
    useEffect(() => {
        const handleScroll = () => {
            if (loading || loadingMore || !hasMore) return

            // Check if near bottom
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
                fetchNews(false)
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [loading, loadingMore, hasMore, page])

    // Filter Logic
    const isImportant = (item: NewsItem) => {
        // Condition 1: Matches Watchlist (Ticker in Title or Summary)
        // Note: Tickers are usually bare (e.g. "AAPL", "0056"). We should be careful with short numbers.
        // For distinctness, maybe check boundaried regex or strict inclusion.
        // Given complexity, simple inclusion is okay for now, but strict for numbers?
        // Let's stick to simple "includes" for now as requested.
        const matchesWatchlist = savedTickers.some(ticker =>
            item.title.includes(ticker) || item.summary.includes(ticker)
        )

        // Condition 2: Non-neutral Sentiment (High Impact)
        // Using > 0.3 (Positive) or < -0.3 (Negative) as thresholds per NewsCard logic
        const isHighImpact = Math.abs(item.sentiment) > 0.3

        return matchesWatchlist || isHighImpact
    }

    const focusNews = news.filter(isImportant)
    const generalNews = news.filter(item => !isImportant(item))

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Market News</h1>
                    <p className="text-muted-foreground">Latest financial news analyzed by AI.</p>
                </div>
                <Button onClick={refreshNews} variant="outline" size="sm">
                    Refresh Sources
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-[125px] w-full rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[250px]" />
                                <Skeleton className="h-4 w-[200px]" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Focus Section */}
                    {focusNews.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary">
                                <Flame className="h-5 w-5 fill-orange-500 text-orange-500" />
                                Market Focus
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                    (High Impact & Watchlist)
                                </span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {focusNews.map((item) => (
                                    <NewsCard key={item.id} news={item} />
                                ))}
                            </div>
                            <Separator className="mt-8" />
                        </div>
                    )}

                    {/* General Section */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Newspaper className="h-5 w-5" />
                            Latest News
                            {news.length === 0 && !loading && (
                                <div className="col-span-full text-center py-12 text-muted-foreground">
                                    No news available (Is the crawler running?)
                                </div>
                            )}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {generalNews.map((item) => (
                                <NewsCard key={item.id} news={item} />
                            ))}
                        </div>
                    </div>

                    {/* Infinite Scroll Loading & End Message */}
                    <div className="py-8 text-center text-muted-foreground">
                        {loadingMore && <div className="animate-pulse">Loading more news...</div>}
                        {!hasMore && news.length > 0 && <div>You're all caught up! (More news will arrive hourly)</div>}
                    </div>
                </>
            )}
        </div>
    )
}
