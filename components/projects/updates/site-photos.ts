'use client'

/**
 * (simplify S-23 · contract C, her "build everything" 2026-10-09) The phone's post, camera first. A browser opens its picker only on a press, so
 * whatever presses *Photos* (the phone site bar) may pick the photos right there and leave them here before it opens Updates with
 * `?compose=1&camera=1`; the composer takes them as it opens (lib/visualizer/pending-photos.ts's way for the Visualizer's welcome). With nothing
 * left here, the composer opens the picker itself — which a phone may refuse once the press is spent; the media well, first on a phone, is then
 * one press away. Kept in memory only: a reload starts clean.
 */
let pending: File[] = []

/** Leave the photos picked on the press for the composer about to open. */
export function stashSitePhotos(files: File[]): void { pending = files.slice() }
/** The composer takes what was left — once. */
export function takeSitePhotos(): File[] { const f = pending; pending = []; return f }
