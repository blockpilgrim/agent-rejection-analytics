import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agent Rejection Analytics",
  description:
    "Understand why AI shopping agents reject your store and what to do about it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen">

        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-12 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 font-semibold group">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 transition-colors group-hover:bg-primary/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 text-primary"
                >
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4" />
                  <line x1="8" y1="16" x2="8" y2="16" />
                  <line x1="16" y1="16" x2="16" y2="16" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Agent Rejection Analytics</span>
            </Link>

            <div className="h-3.5 w-px bg-border" />

            <nav className="flex items-center gap-0.5 text-xs">
              <Link
                href="/"
                className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/storefront"
                className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Storefront
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
