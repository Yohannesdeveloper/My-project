import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { CommandPalette } from "@/components/ui/CommandPalette";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aspio — Multi-Workspace Task Manager",
  description: "Organize projects, track tasks, and collaborate with your team in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="noise-overlay min-h-dvh flex flex-col bg-background text-foreground">
        <ToastProvider>
          <CommandPalette />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
