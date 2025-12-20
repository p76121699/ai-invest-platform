"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Menu, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "@/components/Sidebar"
import { useUI } from "@/components/providers/ui-context"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
    const { theme, setTheme } = useTheme()
    const { toggleSidebar } = useUI()

    return (
        <header className="h-[60px] border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-4">
                {/* Mobile Trigger (Sheet) */}
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-64">
                            <Sidebar />
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Desktop Trigger (Collapsible) */}
                <div className="hidden lg:block">
                    <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                        <Menu className="w-5 h-5" />
                    </Button>
                </div>

                <span className="font-bold">AI Invest</span>
            </div>

            <div className="flex-1" /> {/* Spacer */}

            <div className="flex items-center gap-2">
                {/* Notification Bell */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            {/* Optional: Red dot for unread */}
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[300px]">
                        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-medium">AAPL price target reached</p>
                                <p className="text-xs text-muted-foreground">AI recommends checking the chart.</p>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-medium">Sentiment Alert</p>
                                <p className="text-xs text-muted-foreground">Market sentiment turned bearish.</p>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
        </header>
    )
}
