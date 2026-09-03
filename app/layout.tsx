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

/* (REG-308) viewportFit 'cover' lets the page reach under the notch / home indicator; the mobile chrome pads itself
   back out with env(safe-area-inset-*) (app/globals.css, components/shell/mobile-nav.module.css). */
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5, viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSerif.variable}`}>
      <head>
        {/*
          Icons render as the Material Symbols VARIABLE FONT, exactly as the mocks do (Rounded: Light 300 nav /
          Regular 400 UI, FILL axis for active states; Outlined for the search/close glyphs the mocks use).
          Deviation log #1: the DS ships SVG icons at weight 400 only, which cannot express the Light 300 nav icons.
          The font is self-hosted and subsetted in app/globals.css (audit 2026-08-30) — no external stylesheet, so the
          page no longer render-blocks on fonts.googleapis.com. Preloading the Rounded subset keeps icons from
          arriving a frame late.
        */}
        <link rel="preload" href="/fonts/material-symbols-rounded.subset.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        {/* Generic shell: the single tooltip bubble every page shares. */}
        <TooltipLayer />
      </body>
    </html>
  )
}
