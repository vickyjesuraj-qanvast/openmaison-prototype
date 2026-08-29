import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Serif } from 'next/font/google'
import { siteConfig } from '@/lib/config'
import { TooltipLayer } from '@/components/om/tooltip'

import '@openmaison/react/styles.css'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const notoSerif = Noto_Serif({ subsets: ['latin'], display: 'swap', variable: '--font-noto-serif' })

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSerif.variable}`}>
      <head>
        {/*
          Icons render as the Material Symbols VARIABLE FONT, exactly as the
          mocks do (Rounded: Light 300 nav / Regular 400 UI, FILL axis for
          active states; Outlined for the search/close glyphs the mocks use).
          Deviation log #1: the DS ships SVG icons at weight 400 only, which
          cannot express the Light 300 nav icons.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..700,0..1,0&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=block"
        />
      </head>
      <body>
        {children}
        {/* Generic shell: the single tooltip bubble every page shares. */}
        <TooltipLayer />
      </body>
    </html>
  )
}
