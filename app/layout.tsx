import type { Metadata, Viewport } from 'next'
import { Caprasimo, Caveat, Fraunces, Space_Mono } from 'next/font/google'
import './globals.css'

const display = Caprasimo({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap' })
const hand = Caveat({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-hand', display: 'swap' })
const serif = Fraunces({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-serif', display: 'swap' })
const mono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: 'Daily Delight — a little almanac for curious minds',
  description: 'One surprising fact, a tiny story, and a little more wonder for every day.',
  generator: 'v0.app',
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#FFF4DC' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${hand.variable} ${serif.variable} ${mono.variable}`}>{children} </body></html>
}
