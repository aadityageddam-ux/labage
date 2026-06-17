import type { Metadata } from 'next'
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import EcosystemNav from '@/components/EcosystemNav'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'LabAge — Compute Your Biological Age',
  description:
    'Enter your blood panel values and discover your biological age based on the PhenoAge algorithm (Levine 2018).',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#FAFAFA] text-[#18181B]">
        <EcosystemNav />
          <TooltipProvider delayDuration={200}>
            {children}
          </TooltipProvider>
        </body>
    </html>
  )
}
