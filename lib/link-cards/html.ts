import 'server-only'
import { CARD_SIZE, type LinkCard } from './model'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * (pending modules S02) A link that answers with the thing itself — a shared file's `/f/<token>` sends the file — has no page to carry its card.
 * A chat app fetching it to draw the preview gets this instead: the tags and nothing else, and a refresh to the file (`raw`) for anyone who is
 * not a fetcher after all. People always get the file.
 */
export function previewHtml(card: LinkCard, o: { url: string; image: string; raw: string }): Response {
  const tags = [
    `<title>${esc(card.pageTitle)}</title>`,
    `<meta name="robots" content="noindex, nofollow">`,
    `<meta name="description" content="${esc(card.description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(card.studio)}">`,
    `<meta property="og:title" content="${esc(card.headline)}">`,
    `<meta property="og:description" content="${esc(card.description)}">`,
    `<meta property="og:url" content="${esc(o.url)}">`,
    `<meta property="og:image" content="${esc(o.image)}">`,
    `<meta property="og:image:width" content="${CARD_SIZE.width}">`,
    `<meta property="og:image:height" content="${CARD_SIZE.height}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:image" content="${esc(o.image)}">`,
    `<meta http-equiv="refresh" content="0; url=${esc(o.raw)}">`,
  ]
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">${tags.join('')}</head><body></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
}
