import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { FooterText } from "@/components/FooterText";
import { HeaderNav } from "@/components/HeaderNav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Snack & Catch",
  description: "Cobblemon assistant — cooking recipes & spawn spots per Pokémon.",
};

const THEMES = ["light", "dark", "pokecenter", "grass", "fire", "water"];

async function IntlShell({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem themes={THEMES}>
          <Suspense fallback={<div className="min-h-full" />}>
            <IntlShell>
              <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-40">
                <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <Link href="/" className="font-semibold tracking-tight">
                      Cake <span className="text-accent">&amp;</span> Catch
                    </Link>
                    <HeaderNav />
                  </div>
                  <div className="flex items-center gap-2">
                    <LocaleSwitcher />
                    <ThemeSwitcher />
                  </div>
                </div>
              </header>
              <main className="flex-1">{children}</main>
              <footer className="border-t border-border text-xs text-muted py-4">
                <div className="mx-auto max-w-5xl px-6">
                  <FooterText />
                </div>
              </footer>
            </IntlShell>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
