"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Newspaper, LineChart, Menu, Settings, User, LogOut, Briefcase } from "lucide-react"
import { useEffect, useState } from "react"
import { auth } from "@/lib/auth"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const routes = [
    {
        label: "Market News",
        icon: Newspaper,
        href: "/news",
        color: "text-sky-500",
    },
    {
        label: "Stock Dashboard",
        icon: LayoutDashboard,
        href: "/stocks",
        color: "text-violet-500",
    },
    {
        label: "Backtester",
        icon: LineChart,
        href: "/backtest",
        color: "text-pink-700",
    },
    {
        label: "Paper Trading",
        icon: Briefcase,
        href: "/paper-trading",
        color: "text-emerald-500",
    },
    // Removed AI Assistant from sidebar as requested
]

export function Sidebar() {
    const pathname = usePathname()
    const [userEmail, setUserEmail] = useState<string | null>(null)

    useEffect(() => {
        const interval = setInterval(() => {
            const email = auth.getUserEmail()
            if (email !== userEmail) {
                setUserEmail(email)
            }
        }, 1000) // Poll for auth changes since we don't have global context

        const email = auth.getUserEmail()
        setUserEmail(email)
        return () => clearInterval(interval)
    }, [userEmail])

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-background border-r text-foreground transition-colors duration-300">
            <div className="px-3 py-2 flex-1">
                <Link href="/" className="flex items-center pl-3 mb-14">
                    <div className="relative w-8 h-8 mr-4">
                        <div className="w-8 h-8 bg-gradient-to-tr from-violet-500 to-orange-500 rounded-full" />
                    </div>
                    <h1 className="text-2xl font-bold">AI Invest</h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-muted rounded-lg transition",
                                pathname === route.href ? "bg-muted font-bold text-primary" : "text-muted-foreground"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="px-3 py-2">
                <div className="space-y-1">
                    {userEmail ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="w-full text-sm group flex p-3 justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition text-zinc-400 outline-none">
                                    <div className="flex items-center flex-1">
                                        <User className="h-5 w-5 mr-3 text-emerald-500" />
                                        <span className="truncate max-w-[140px]" title={userEmail}>{userEmail}</span>
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 mb-2" align="start" side="right">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="cursor-pointer w-full flex items-center">
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => auth.logout()}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Link
                            href="/login"
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname === "/login" ? "text-white bg-white/10" : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <User className="h-5 w-5 mr-3 text-zinc-400" />
                                Login / Register
                            </div>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}
