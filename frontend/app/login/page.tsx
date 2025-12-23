"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const { toast } = useToast()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await auth.login(email, password);
            toast({
                title: "Welcome back!",
                description: "Login successful.",
            })
            // Force reload to update Header state (since we don't have global context yet)
            // Or better: dispatch a custom event or use window.location.href to refresh entirely
            window.location.href = '/stocks';
        } catch (err: any) {
            setError('Login failed. Please check credentials.');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4 font-sans text-white">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-gray-900 p-8 shadow-2xl border border-gray-800">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-blue-400">Welcome Back</h2>
                    <p className="mt-2 text-gray-400">Sign in to your account</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Email address</label>
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Password</label>
                            <input
                                type="password"
                                required
                                autoComplete="current-password"
                                className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                    <div>
                        <button
                            type="submit"
                            className="group relative flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200"
                        >
                            Sign in
                        </button>
                    </div>
                </form>
                <div className="text-center text-sm">
                    <span className="text-gray-400">Don't have an account? </span>
                    <Link href="/register" className="font-medium text-blue-500 hover:text-blue-400">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
}
