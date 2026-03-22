import type { Metadata } from 'next'
import { League_Spartan, Sora, JetBrains_Mono } from 'next/font/google'
import '@/styles/globals.css'

const leagueSpartan = League_Spartan({
  subsets: ['latin'],
  variable: '--font-league-spartan',
})
const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'AgentGate',
  description: 'Enterprise AI agent permission management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${leagueSpartan.variable} ${sora.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
