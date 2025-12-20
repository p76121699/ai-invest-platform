"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUp, ArrowDown, Activity, TrendingUp, Zap } from "lucide-react"
import { MarketHeatmap } from "@/components/MarketHeatmap"

import axios from "axios"
import { useEffect, useState } from "react"

export default function Dashboard() {
  const [news, setNews] = useState<any[]>([])

  useEffect(() => {
    async function fetchTopNews() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
        const res = await axios.get(`${API_URL}/news?limit=3`)
        if (Array.isArray(res.data)) {
          setNews(res.data)
        } else if (res.data.news) {
          setNews(res.data.news)
        }
      } catch (e) {
        console.error("Failed to load dashboard news", e)
      }
    }
    fetchTopNews()
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">Real-time market insights and semantic analysis.</p>
      </div>

      {/* Market Summary Strip */}
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Market Sentiment"
          icon={TrendingUp}
          value="Neutral"
          sub="Based on 60 articles"
          trend="positive"
        />
        <SummaryCard
          title="Top Movers"
          icon={Zap}
          value="NVDA +5.2%"
          sub="TSLA -2.1%"
          trend="mixed"
        />
        <SummaryCard
          title="Volatility Index"
          icon={Activity}
          value="18.4"
          sub="Low Volatility"
          trend="neutral"
        />
      </div>

      {/* Market Heatmap */}
      <MarketHeatmap />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* News Feed Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Latest Market News</h2>
            <a href="/news" className="text-sm text-primary hover:underline">View All</a>
          </div>

          {/* Real News Feed */}
          <div className="grid gap-4">
            {news.map((item: any) => (
              <a href={`/news/${item.id}`} key={item.id} className="block group">
                <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm flex gap-4 items-center transition-colors hover:bg-muted/50">
                  <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs
                      ${item.sentiment > 0.3 ? 'bg-green-500/10 text-green-500' :
                      item.sentiment < -0.3 ? 'bg-red-500/10 text-red-500' :
                        'bg-blue-500/10 text-blue-500'}
                   `}>
                    {item.sentiment > 0.3 ? 'BULL' : item.sentiment < -0.3 ? 'BEAR' : 'NEUT'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate group-hover:text-primary transition-colors">{item.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">{item.source}</span>
                      <span>•</span>
                      <span>{new Date(item.published_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
            {news.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Loading market insights...</div>
            )}
          </div>
        </div>

        {/* Portfolio Panel (Migrated to /paper-trading) */}
      </div>
    </div>
  )
}

function SummaryCard({ title, icon: Icon, value, sub, trend }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {sub}
        </p>
      </CardContent>
    </Card>
  )
}
