"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, X, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useUI } from "@/components/providers/ui-context"

export function FloatingAssistant() {
    const { isAssistantOpen, toggleAssistant, setAssistantOpen } = useUI()
    const [input, setInput] = useState("")
    const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
        { role: 'bot', text: "Hello! specific questions clearly (e.g. 'Analyze $TSLA')." }
    ])
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isAssistantOpen])

    const handleSend = async () => {
        if (!input.trim()) return

        const userMsg = input
        setMessages(prev => [...prev, { role: 'user', text: userMsg }])
        setInput("")
        setLoading(true)

        // Add placeholder bot message for streaming
        setMessages(prev => [...prev, { role: 'bot', text: "" }])

        try {
            const res = await fetch("http://localhost:8000/api/v1/assistant/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg })
            })

            if (!res.body) return

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let done = false
            let accumulatedText = ""

            while (!done) {
                const { value, done: doneReading } = await reader.read()
                done = doneReading
                const chunkValue = decoder.decode(value, { stream: true })
                accumulatedText += chunkValue

                // Update last message
                setMessages(prev => {
                    const newMsgs = [...prev]
                    newMsgs[newMsgs.length - 1] = { role: 'bot', text: accumulatedText }
                    return newMsgs
                })
            }
        } catch (e) {
            setMessages(prev => {
                const newMsgs = [...prev]
                newMsgs[newMsgs.length - 1] = { role: 'bot', text: "Sorry, I am having trouble connecting to the server." }
                return newMsgs
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* Toggle Button - always visible */}
            {!isAssistantOpen && (
                <Button
                    onClick={toggleAssistant}
                    className="fixed bottom-6 right-6 h-[60px] w-[60px] rounded-full shadow-2xl z-50 p-0 hover:scale-105 transition-all duration-300 bg-gradient-to-r from-indigo-500 to-purple-600 border-2 border-white/20 animate-in fade-in zoom-in"
                    size="icon"
                >
                    <Bot className="h-8 w-8 text-white" />
                </Button>
            )}

            {/* Sidebar Panel */}
            <div
                className={`
                    fixed top-0 right-0 h-full w-[450px] bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-40
                    transform transition-transform duration-300 ease-in-out flex flex-col
                    ${isAssistantOpen ? 'translate-x-0' : 'translate-x-full'}
                `}
            >
                {/* Header */}
                <div className="p-4 border-b bg-card flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-foreground">
                        <Terminal className="w-5 h-5 text-green-400" />
                        <span className="font-semibold">AI Market Analyst</span>
                        <span className="text-xs text-zinc-500 font-mono border border-zinc-700 px-2 py-0.5 rounded-full">
                            LLAMA 3.2
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAssistantOpen(false)}
                        className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Chat History */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
                >
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
                                max-w-[90%] rounded-2xl p-3 text-sm shadow-md
                                ${m.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-br-none'
                                    : 'bg-muted/80 text-foreground rounded-bl-none border border-border'}
                            `}>
                                {m.role === 'bot' ? (
                                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed dark:prose-invert">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {m.text}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    m.text
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && messages[messages.length - 1].text === "" && (
                        <div className="flex justify-start">
                            <div className="bg-muted rounded-2xl p-3 text-sm animate-pulse flex gap-1 items-center">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-75" />
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-150" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t bg-card flex gap-2 shrink-0">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about $TSLA, market sentiment..."
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-indigo-500"
                    />
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={loading}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </>
    )
}
