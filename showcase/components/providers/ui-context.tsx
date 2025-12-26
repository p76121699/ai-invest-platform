
"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface UIContextType {
    isSidebarOpen: boolean
    toggleSidebar: () => void
    isAssistantOpen: boolean
    toggleAssistant: () => void
    setAssistantOpen: (open: boolean) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: React.ReactNode }) {
    // Default sidebar open on desktop, but we handle via CSS/layout logic usually. 
    // Let's assume true.
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isAssistantOpen, setIsAssistantOpen] = useState(false)

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev)
    const toggleAssistant = () => setIsAssistantOpen(prev => !prev)

    return (
        <UIContext.Provider value={{
            isSidebarOpen,
            toggleSidebar,
            isAssistantOpen,
            toggleAssistant,
            setAssistantOpen: setIsAssistantOpen
        }}>
            {children}
        </UIContext.Provider>
    )
}

export function useUI() {
    const context = useContext(UIContext)
    if (context === undefined) {
        throw new Error("useUI must be used within a UIProvider")
    }
    return context
}
