import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Spec mentions modern typography like Inter
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { UIProvider } from "@/components/providers/ui-context";
import { MainLayout } from "@/components/layout/MainLayout";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Invest Platform",
  description: "Personal Investment Analysis Agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UIProvider>
            <MainLayout>
              {children}
            </MainLayout>
            <Toaster />
          </UIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
