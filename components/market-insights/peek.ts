/**
 * (pending modules S25 · REG-708) What a card just opened says about its article — set by the card's press, in this page's memory only (never
 * stored, never on the server: a click handler is the one writer), so the article's loader and its reveal draw the article's own category,
 * headline, first lines and byline as bars exactly where they will land. A hard load holds none, and both draw the usual shape.
 */
export type ArticlePeek = { id: string; eyebrow: string; title: string; excerpt: string | null; when: string; sample: boolean; cover: boolean }

let current: ArticlePeek | null = null
export const rememberPeek = (p: ArticlePeek) => { current = p }
export const peekFor = (id: string | null | undefined): ArticlePeek | null => (id && current?.id === id ? current : null)
