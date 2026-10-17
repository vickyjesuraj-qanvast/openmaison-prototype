/*
 * (pending modules S35) The website's motion — 1.0's art direction §1.7, named once: "one easing curve everywhere: cubic-bezier(0.16, 1, 0.3, 1);
 * micro 200–300ms, reveals 500–700ms … everything respects prefers-reduced-motion". The site is OpenMaison's editorial pages, not the studio
 * app, so these are its own tokens beside lib/motion.ts (the app's); the CSS side reads the same values from app/site/site-tokens.css. The root
 * MotionConfig honours reduced motion (components/shell/motion-root.tsx).
 */
export const SITE_EASE = [0.16, 1, 0.3, 1] as const
export const siteMotion = {
  /** a word or a card swapping in place (the hero's rotating word) */
  swap: { duration: 0.5, ease: SITE_EASE },
  /** the menu's panel and the phone's sheet */
  panel: { duration: 0.34, ease: SITE_EASE },
  /** a count or a bar settling */
  settle: { duration: 0.6, ease: SITE_EASE },
} as const
/** How long the hero holds each module before the next (1.0's 3.5 s; it pauses while read). */
export const HERO_CYCLE_MS = 3500
/** The rotating lead / floor in the module pictures (1.0's 2.8 s · 1.9 s). */
export const LEADS_CYCLE_MS = 2800
export const FLOOR_CYCLE_MS = 1900
