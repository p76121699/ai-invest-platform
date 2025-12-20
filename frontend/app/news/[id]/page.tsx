"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface NewsDetail {
    id: string
    title: string
    published_at: string
    source: string
    url: string
    content_html?: string
    image_url?: string | null
}

import { useUI } from "@/components/providers/ui-context"
import { cn } from "@/lib/utils"

export default function NewsDetailPage() {
    const params = useParams()
    const id = params.id as string
    const [news, setNews] = useState<NewsDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { isSidebarOpen } = useUI()

    useEffect(() => {
        if (!id) return

        const fetchNewsDetail = async () => {
            try {
                setLoading(true)
                const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
                const response = await axios.get<NewsDetail>(`${API_URL}/news/${id}`)
                setNews(response.data)
                setError(null)
            } catch (err) {
                console.error("Failed to fetch news detail:", err)
                setError("Failed to load news content.")
            } finally {
                setLoading(false)
            }
        }

        fetchNewsDetail()
    }, [id])

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>
    }

    if (error || !news) {
        return <div className="p-8 text-center text-red-500">{error || "News not found"}</div>
    }

    // Heuristic: If content_html already has an <img> tag, don't show the header image to avoid duplicates
    const hasBodyImage = news.content_html && news.content_html.includes("<img")

    return (
        <div className="container mx-auto p-4 max-w-4xl min-h-screen" data-testid="news-detail">
            {/* Fixed Back Button - Positioned to avoid Sidebar and AI Assistant */}
            <div
                className={cn(
                    "fixed top-[84px] z-40 transition-all duration-300",
                    isSidebarOpen ? "left-72" : "left-8"
                )}
            >
                <Link href="/news">
                    <div className="bg-background/80 backdrop-blur-md shadow-lg border rounded-full px-4 py-2 hover:bg-accent transition-all flex items-center gap-2 group">
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back to News</span>
                    </div>
                </Link>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">{news.source}</span>
                        <span className="text-sm text-muted-foreground">{new Date(news.published_at).toLocaleString()}</span>
                    </div>
                    <CardTitle className="text-3xl font-bold" data-testid="news-detail-title">
                        {news.title}
                    </CardTitle>
                    {/* Only show header image if not already in body */}
                    {news.image_url && !hasBodyImage && (
                        <div className="mt-4 relative w-full h-64 md:h-96 rounded-lg overflow-hidden">
                            <img
                                src={news.image_url}
                                alt={news.title}
                                className="object-cover w-full h-full"
                            />
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div
                        data-testid="news-detail-content"
                        className="news-content prose prose-stone dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: news.content_html || "<p>內容暫時無法取得</p>" }}
                    />

                    <div className="mt-8 pt-4 border-t">
                        <a
                            data-testid="news-original-link"
                            href={news.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            原始來源
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
