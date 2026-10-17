import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Serif } from 'next/font/google'
import { siteConfig } from '@/lib/config'
/* (S44 closing regression, 2026-10-15) The stylesheets come before every component import: CSS is emitted in import order, and a
   component imported first (the Tooltip — since S43E it imports the snackbar, which pulls house modules in) put its layers
   (om-empty-card, om-card-table) ahead of globals' `@layer om-reset;` statement, so om-reset was no longer the lowest layer (REG-896). */
import '@openmaison/react/styles.css'
import './globals.css'
import { TooltipLayer } from '@/components/om/tooltip'
import { MotionRoot } from '@/components/shell/motion-root'


const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const notoSerif = Noto_Serif({ subsets: ['latin'], display: 'swap', variable: '--font-noto-serif' })

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  /* (pending modules S41b-2 — the ledger's open items; 1.0's favicon, app icon and src/app/manifest.ts) the house mark in the browser's tab and
     on a home screen, and OpenMaison as an installable app (public/manifest.json: standalone, opening at the front door). A static file, so
     the proxy never asks for a session to read it; set here rather than as app/manifest.ts so a client's pages can take both off
     (lib/links/client-page.ts) — they wear only their studio's name. The manifest is 1.0's words without "with AI built in" (Maison AI
     answers by rule here). *(invented copy, for Vicky)* */
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/brand/favicon.svg', type: 'image/svg+xml' }, { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
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
        {/* (F172) motion honours the viewer's reduced-motion setting on every page */}
        <MotionRoot>
          {children}
          {/* Generic shell: the single tooltip bubble every page shares. */}
          <TooltipLayer />
        </MotionRoot>
      </body>
    </html>
  )
}
