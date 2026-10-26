import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SiteHeader } from '@/components/site-header'
import { BottomNav } from '@/components/bottom-nav'
import { CONTACT_URL, LOGO_URL } from '@/lib/site'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'ANIME EXPO — Watch Anime Online',
  description:
    'Stream trending, popular, and latest anime episodes with sub and dub. Fast, clean, and free.',
  generator: 'v0.app',
  keywords: ['anime', 'stream anime', 'watch anime', 'sub', 'dub', 'episodes'],
  openGraph: {
    title: 'ANIME EXPO — Watch Anime Online',
    description: 'Stream trending, popular, and latest anime episodes with sub and dub.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SiteHeader />
        <div className="min-h-[calc(100dvh-4rem)] overflow-x-clip pb-[calc(7rem+env(safe-area-inset-bottom))]">{children}</div>
        <BottomNav />
        <footer className="border-t border-border/60 px-4 py-8 pb-[calc(8rem+env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground">
          <p>
            <img src={LOGO_URL} alt="AnimExpo" className="mx-auto h-8 w-auto object-contain" />
            <span className="sr-only">AnimExpo — Stream your favorite anime.</span>
          </p>
          <p className="mt-3">
            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Contact Us on Telegram
            </a>
          </p>
        </footer>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
