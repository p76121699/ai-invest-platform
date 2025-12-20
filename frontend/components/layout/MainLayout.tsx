
"use client"

import { Sidebar } from "@/components/Sidebar"
import { Header } from "@/components/Header"
import { FloatingAssistant } from "@/components/FloatingAssistant"
import { Toaster } from "@/components/ui/toaster"
import { useUI } from "@/components/providers/ui-context"
import { cn } from "@/lib/utils"

export function MainLayout({ children }: { children: React.ReactNode }) {
    const { isSidebarOpen, isAssistantOpen } = useUI()

    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden">
            {/* Left Sidebar (Desktop) */}
            <div
                className={cn(
                    "hidden lg:block border-r fixed h-full z-10 bg-[#111827] transition-all duration-300",
                    isSidebarOpen ? "w-64" : "w-0 -translate-x-full opacity-0"
                )}
            >
                <div className="w-64 h-full"> {/* Inner container to prevent content squishing */}
                    <Sidebar />
                </div>
            </div>

            {/* Main Content Area */}
            <div
                className={cn(
                    "flex-1 flex flex-col transition-all duration-300 ease-in-out",
                    isSidebarOpen ? "lg:pl-64" : "lg:pl-0",
                    isAssistantOpen ? "lg:pr-[450px]" : "lg:pr-0"
                )}
            >
                <Header />
                <main className="flex-1 p-6 w-full max-w-[1600px] mx-auto">
                    {children}
                </main>
                <Toaster />
            </div>

            {/* Right Assistant (Sidebar Mode) */}
            {/* FloatingAssistant component will handle its own visibility via CSS transform, 
                but here we just place it. It needs to consume context. 
                Wait, FloatingAssistant has its own logic. I need to update it to use Context to match the 'pr-[450px]' logic.
            */}
            <FloatingAssistant />
        </div>
    )
}
