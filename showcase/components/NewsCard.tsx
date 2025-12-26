"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface NewsItem {
    id: string
    title: string
    summary: string
    source: string
    link: string
    published_at: string
    sentiment: number
    relevance?: number
    entities?: {}
    image_url?: string
}

interface NewsCardProps {
    news: NewsItem
    readonly?: boolean
}

export function NewsCard({ news, readonly = false }: NewsCardProps) {
    const router = useRouter()

    // Sentiment Logic
    // Range -1 to 1.
    // Display as 0 to 100 on bar?
    // Let's normalize: 0 = center.
    // Width = abs(sentiment) * 100 ?
    // Or just a simple bar from 0 to 1?

    let sentimentColor = "bg-gray-500"
    let sentimentLabel = "Neutral"
    let barWidth = "0%"

    // Calculate simple percentage for display (0-100 relative to intensity)
    const intensity = Math.abs(news.sentiment) * 100
    barWidth = `${Math.min(intensity, 100)}%`

    if (news.sentiment > 0.1) {
        sentimentColor = "bg-green-500"
        sentimentLabel = "Positive"
    } else if (news.sentiment < -0.1) {
        sentimentColor = "bg-red-500"
        sentimentLabel = "Negative"
    }

    const handleDetailClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!readonly) {
            router.push('/news/' + news.id)
        }
    }

    // Relative Time
    let timeAgo = ""
    try {
        timeAgo = formatDistanceToNow(new Date(news.published_at), { addSuffix: true, locale: zhTW })
    } catch (e) {
        timeAgo = new Date(news.published_at).toLocaleDateString()
    }

    return (
        <Card className={`news-item overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border-l-4 group h-full ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
            style={{ borderLeftColor: news.sentiment > 0.1 ? '#22c55e' : news.sentiment < -0.1 ? '#ef4444' : '#6b7280' }}
            data-testid={`news-item-${news.id}`}
            onClick={handleDetailClick}>
            <CardContent className="p-0 flex h-full">
                {/* Thumbnail */}
                {news.image_url && (
                    <div className="w-[120px] min-w-[120px] bg-muted relative shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={news.image_url}
                            alt={news.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                            onError={(e) => {
                                e.currentTarget.parentElement!.style.display = 'none';
                            }}
                        />
                    </div>
                )}

                <div className="p-4 flex flex-col w-full relative">
                    <div className="flex justify-between items-center mb-2">
                        <Badge variant="secondary" className="text-[10px] h-5 truncate max-w-[100px] font-mono">
                            {news.source || 'RSS'}
                        </Badge>

                        {/* Sentiment Meter */}
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${sentimentColor.replace('bg-', 'text-')}`}>
                                {sentimentLabel}
                            </span>
                            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${sentimentColor} transition-all duration-500`}
                                    style={{ width: barWidth }}
                                />
                            </div>
                        </div>
                    </div>

                    <h3 className="text-base font-bold leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {news.title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                        {news.summary}
                    </p>

                    <div className="mt-auto flex justify-between items-center pt-2 border-t border-border/50">
                        <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            {timeAgo}
                        </div>
                        <Button
                            className="h-6 text-[10px] px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            variant="default"
                            size="sm"
                        >
                            Read More
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
