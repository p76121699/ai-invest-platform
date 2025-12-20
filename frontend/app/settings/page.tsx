"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        setIsLoading(false)
        toast({
            title: "Profile updated",
            description: "Your profile has been successfully updated.",
        })
    }

    const handleApiKeySave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        await new Promise(resolve => setTimeout(resolve, 800))
        setIsLoading(false)
        toast({
            title: "API Keys saved",
            description: "Your API keys have been securely stored.",
        })
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">
                    Manage your account settings and API keys.
                </p>
            </div>
            <Separator />

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="api-keys">API Keys</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile</CardTitle>
                            <CardDescription>
                                Update your personal details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" defaultValue="user@example.com" disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <Input id="password" type="password" />
                                </div>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Saving..." : "Save Changes"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="api-keys">
                    <Card>
                        <CardHeader>
                            <CardTitle>API Keys</CardTitle>
                            <CardDescription>
                                Manage keys for external data providers (AlphaVantage, Finnhub).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={handleApiKeySave} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="alphavantage">AlphaVantage Key</Label>
                                    <Input id="alphavantage" placeholder="Enter key..." />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="finnhub">Finnhub Key</Label>
                                    <Input id="finnhub" placeholder="Enter key..." />
                                </div>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Saving..." : "Save Keys"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
