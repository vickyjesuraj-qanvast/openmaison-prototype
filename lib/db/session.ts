/**
 * WHO IS WRITING (REG-286) — the one stand-in for the signed-in user until auth exists.
 *
 * The prototype has no sessions: every write is attributed to Dane, the row in `members` that carries
 * `is_you` (the studio owner in `lib/leads/enums.ts` TEAM). This used to be `const ME = 'dane'` copied
 * into five server-action modules AND into `lib/leads/activity.ts`, where it decides whether a derived
 * sentence reads "You" or the member's name — six places to remember when authentication lands.
 *
 * It is a `members.id`, not a display name: resolve the real session member here (and nowhere else) and
 * every action stamp and every generated sentence follows.
 */
export const SESSION_MEMBER_ID = 'dane'
