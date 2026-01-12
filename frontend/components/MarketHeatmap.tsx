"use client"

import { ResponsiveContainer, Treemap, Tooltip as RechartsTooltip } from "recharts"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Mock Data for Heatmap
const MOCK_MARKET_DATA = [
    {
        name: "Technology",
        children: [
            { name: "AAPL", size: 3500, score: 0.012 },
            { name: "MSFT", size: 3200, score: -0.005 },
            { name: "NVDA", size: 2800, score: 0.045 },
            { name: "GOOGL", size: 2000, score: 0.008 },
            { name: "TSLA", size: 900, score: -0.021 },
            { name: "AMD", size: 300, score: 0.032 },
        ]
    },
    {
        name: "Finance",
        children: [
            { name: "JPM", size: 600, score: 0.003 },
            { name: "V", size: 500, score: -0.010 },
            { name: "MA", size: 450, score: -0.005 },
            { name: "BAC", size: 300, score: 0.015 },
        ]
    },
    {
        name: "Healthcare",
        children: [
            { name: "LLY", size: 800, score: 0.021 },
            { name: "UNH", size: 500, score: -0.002 },
            { name: "JNJ", size: 400, score: 0.001 },
        ]
    },
    {
        name: "Consumer",
        children: [
            { name: "AMZN", size: 1800, score: 0.018 },
            { name: "WMT", size: 500, score: 0.005 },
            { name: "COST", size: 400, score: -0.008 },
        ]
    }
]

// Flatten data for easy lookup in custom component
const SCORE_LOOKUP: Record<string, number> = {};
MOCK_MARKET_DATA.forEach(category => {
    category.children.forEach(item => {
        SCORE_LOOKUP[item.name] = item.score;
    });
});

const CustomizedContent = (props: any) => {
    const { depth, x, y, width, height, name } = props;

    // Look up score directly from our map using the Name
    const score = SCORE_LOOKUP[name];

    // 1. If no score found (Group Node / Category), render transparent wireframe
    if (typeof score !== 'number') {
        return (
            <g>
                <rect
                    x={x} y={y} width={width} height={height}
                    fill="transparent"
                    stroke="#334155" // slate-700
                    strokeWidth={1}
                />
            </g>
        );
    }

    // 2. Leaf Nodes (has score)
    const isPositive = score >= 0;
    const intensity = Math.min(Math.abs(score) * 20, 1);

    // Solid colors
    const fillColor = isPositive
        ? `rgba(34, 197, 94, ${0.6 + intensity * 0.4})`
        : `rgba(239, 68, 68, ${0.6 + intensity * 0.4})`;

    const fontSize = Math.min(width / 4, height / 3, 16);
    const showTicker = width > 40 && height > 30;
    const showPercent = width > 60 && height > 50;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: fillColor,
                    stroke: "#0f172a", // Dark border for separation
                    strokeWidth: 2,
                    rx: 4, // Rounded corners
                    ry: 4,
                }}
            />
            {showTicker && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={Math.floor(fontSize)}
                    fontWeight="bold"
                    dy={showPercent ? -6 : 4} // Shift up if showing %, else center
                    style={{ pointerEvents: 'none' }}
                >
                    {name}
                </text>
            )}
            {showPercent && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.9)"
                    fontSize={Math.floor(fontSize * 0.75)}
                    dy={12}
                    style={{ pointerEvents: 'none' }}
                >
                    {((score ?? 0) * 100).toFixed(1)}%
                </text>
            )}
        </g>
    );
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-sm text-slate-100 z-50">
                <p className="font-bold text-base mb-1">{data.name}</p>
                <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Change:</span>
                    <span className={data.score >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                        {((data.score ?? 0) * 100).toFixed(2)}%
                    </span>
                </div>
                <div className="flex justify-between gap-4 mt-1">
                    <span className="text-slate-400">Size (Cap):</span>
                    <span>{data.size}</span>
                </div>
            </div>
        );
    }
    return null;
};

export function MarketHeatmap() {
    return (
        <Card className="h-[450px] flex flex-col">
            <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/50">
                <CardTitle className="flex items-center gap-2">
                    Market Heatmap
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[300px] p-4 bg-slate-900 text-slate-100 border-slate-800">
                                <div className="space-y-2">
                                    <h4 className="font-bold border-b border-slate-700 pb-1">Heatmap Guide</h4>
                                    <p><span className="font-bold text-blue-400">Size</span>: Represents Market Capitalization (company value).</p>
                                    <p><span className="font-bold text-green-400">Color</span>: Represents Daily Price Change.</p>
                                    <ul className="list-disc list-inside text-xs text-slate-400 mt-2">
                                        <li><span className="text-green-500">Bright Green</span>: Strong Gain</li>
                                        <li><span className="text-red-500">Bright Red</span>: Strong Loss</li>
                                        <li><span className="text-slate-500">Dark/Grey</span>: No Change</li>
                                    </ul>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={MOCK_MARKET_DATA}
                        dataKey="size"
                        aspectRatio={4 / 3}
                        stroke="none"
                        content={<CustomizedContent />}
                    >
                        <RechartsTooltip content={<CustomTooltip />} cursor={false} />
                    </Treemap>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
