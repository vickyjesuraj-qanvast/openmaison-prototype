# S13 · Client portal leftovers — outcome (2026-10-12)

Card: `held:client-portal` (the client portal `/my/[slug]` and Company › Client portal; recommendation *developers' lane*, effort S — "Only the
services and a legal footer stand between it and real clients"; its question "Add Privacy and Terms links to the portal footer?"). 1.0 read:
`src/components/homeowner/portal-footer-extras.tsx` (`FooterLinksRow` — Privacy · Terms · Contact, each only when set — and `SocialLinksRow`),
its five layouts' footers (`src/components/homeowner/layouts/*-layout.tsx`), `src/components/settings/studio-profile-config.tsx` (the Footer Links
card: Privacy Policy URL · Terms URL · Contact URL) + `src/lib/queries/portal-settings.ts` (`StudioFooterLinks`), `src/app/api/homeowner/auth/{login,
verify,me,logout}/route.ts` (Twilio Verify, the per-IP limit `src/lib/rate-limit.ts` — 5 a minute — the studio-scoped profile), `src/app/my/page.tsx`
· `src/app/my/login/page.tsx` (the studio picker / signpost). Carried notes taken: S01 (faces on the portal), S02 (an unknown address's own notice),
S04 · S07 · S10 (re-checked). Register rows: `steps/reg-S13.md` (REG-S13.1…6). Probe: `design-source/verify/pending-modules/verify-pm2-s13.cjs`
(**65 / 65**; a full `.dump` before and after a run is identical); shots banked in `design-source/verify/pending-modules/pm2-s13/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| SMS code with rate limits at sign-in — "stand-in (any six digits) · as recommended (Q-38) · developers' lane" | **Stand-in, kept.** The code step shows as it will; any six digits pass; no SMS is sent and no limit is kept. 1.0's limit was an in-memory 5-a-minute per IP in front of Twilio — it belongs with the real SMS service (and a limit on a code that is never checked guards nothing, while it would trip the testers' and probes' repeated sign-ins). S30 / S34 | — |
| Several studios on one platform (the /my studio picker) — "stand-in · developers' lane" | **Stand-in, kept** — `/my` and `/my/login` go to the one studio's portal. **Built with it (S02's note):** an address this studio doesn't hold keeps its own notice — see the last row | — |
| Client emails and WhatsApp actually sent — "stand-in (outbox) · developers' lane" | **Stand-in, kept** — every client message lands in the house outbox (Settings › Notifications › Sent messages); S34's adapters | — |
| Footer Privacy · Terms · Contact links — "dropped · package (H-Q27) · revisit: a portal that signs people in by phone needs a privacy notice (PDPA)" | **Built, as recommended.** The client: one quiet row — the studio's own *Privacy · Terms · Contact*, only the links set, in that order — under every portal page's content, inside the sign-in page's foot (where the number is asked for) and under the paused / gone notices; each opens the studio's site in a new tab; none while none is set; never printed; 44 tall under a finger; the ghosts draw it only once this browser has seen the studio's foot. The studio: Company › Client portal › **Privacy and terms** (the Welcome line's pattern: three link boxes, Save with Undo, Cancel, the leave guard; a bad address refused under its box and by the server; Owners and Admins) and **Getting it live's fifth check, Privacy notice** (not done until linked, says why — PDPA — and lands on the card with its first box focused); ⌘K finds it | `lib/portal/links.ts` (new, pure: `FOOT_LINKS` · `parseFootLinks` · `footLinkProblem` · `footLinksShown` · `privacyStepLine` · `LINKS_HELP`), `lib/portal/sections-queries.ts` (`fetchPortalLinks` · `savePortalLinks`), `lib/portal/queries.ts` (`PortalLook.links`, `PortalSetup.links`), `app/portal/sections-actions.ts` (`setPortalLinks`), `components/portal/portal-foot.tsx` (new: `PortalFoot` · `PortalFootGhost` · `PORTAL_FOOT_KEY`), `components/portal/{portal-frame,portal-sign-in,portal-notice,portal-ghosts}.tsx`, `components/portal/portal.module.css` (`.legal` · `.legalInline` · `.legalDot` · `.noticeFoot`, print), `components/company/portal/{portal-sections-card,portal-setup-view,portal-ghosts}.tsx` (+ `portal-sections.module.css` `.anchor`), `lib/global-search/model.ts` (`co-portal-links`), `scripts/repair-demo-data.ts` (R115) |
| 1.0's portal and pay links do not redirect — "waits on her (D-11)" | **Already built by S02** (D-11 as recommended, `lib/links/old-links.ts`); re-checked here (`/pay/<token>`, `/my/<slug>/p/<token>`, `/my/Demo-Studio/projects/<id>`) | — |
| Themes, six sign-in layouts, card payments, client to-dos — "dropped as recommended (Q-37 · Q-39 · Q-44 · F-15 · M-03) · keep" | **Kept** dropped | — |
| *(S01's note)* the portal shows a member's tint, not their photo, outside About › Our team | **Built** — a member of the client's own team shows their photo beside their messages (Messages) and their answers (Issues), through the portal's own address `/my/<address>/face/<picture>` (the gate; only a member on one of that visitor's homes — the client's or their household's; a preview through its own address); a member with no photo keeps their tint; no `/company/picture/` on a client's page | `lib/company/member-photo.ts` (the `face:` look, `portalFaceHref`, `ClientFaces`, `forClient(rows, faces)`, `avatarSrc`, `lookUnder`), `lib/portal/faces.ts` (new: `clientFaces` · `isClientFace`), `app/my/[slug]/face/[id]/route.ts` (new), `lib/projects/messages.ts` (`fetchPortalConversations` `faces`), `app/my/[slug]/messages/page.tsx`, `app/portal/messages-actions.ts` (`readClientChats`), `lib/portal/threads.ts` (`fetchPortalIssues`, `fetchPortalChats`) |
| *(S02's note)* an unknown portal address in an old link falls to the studio's portal | **Built** — a 1.0 link naming an address no studio here holds lands on that address's own notice ("This address doesn’t open a portal"), never this studio's sign-in; every portal page at such an address titles its tab the same and carries no studio's card | `lib/links/old-links.ts` (`portalOf`), `lib/portal/meta.ts` (new: `portalTitle` · `unknownPortalMeta` · `NO_PORTAL`), the nineteen `app/my/[slug]/**/page.tsx` `generateMetadata` |
| *(S04 · S07 · S10's notes)* | **Re-checked** — the portal reads no quote line (its documents open `/confirm/<token>` and `/sign/<token>/quote`, S04's projection); the overpayment credit shows on Money ("Your credit CN-… (S$… left)", pm2-s07 green); Company › Client portal's three Maison AI suggestions act (pm2-s10 green) — the client's portal itself has no Maison AI | — |

**Found and fixed on the way (bug):** the sign-in page's ghost drew its foot's sentence as one bar while the page wraps "Only the numbers your
studio has added can open this page." to two lines in its 392 column — 20px short, so the centred column jumped on reveal; the ghost now sets the
sentence's own words as bars (`Words`), measured equal (ghost y 642 h 89 · page y 639 h 89).

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **"Add Privacy and Terms links to the portal footer?" — yes, and 1.0's Contact with them** (1.0 had all three). Links to the studio's own
  pages, never words written for it: a privacy notice is the studio's legal text (2.0 doesn't write one), so the demo links none and Getting it
  live shows the step to do — no made-up address that would open nothing.
- **One home: Company › Client portal**, beside the welcome line (the portal's other client-facing words) — not Company › Profile (the studio's
  facts for its documents). The fifth Getting it live check is what makes the PDPA point land where a studio readies the portal.
- **Only on the portal** (`/my/*`), as 1.0's footers were; the other client links (`/confirm`, `/sign`, `/quote`, `/invoice`…) carry none — the
  studio's letterhead is on those. Open for Vicky if she wants the row there too.
- **The rate limit stays with the real SMS** (S30 / S34): the stand-in checks no code, so a limit would only block testers.
- **Faces: the client's own team only** — the members on their homes now; a line by someone no longer on the team shows their tint (the route
  serves nothing it would not draw, so no broken picture).

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440:** Company › Client portal — Getting it live "3 of 5 done" (or 4 of 5 once tried) with *Privacy notice* not done and why;
  *Add the link* → the Privacy and terms card, the first box focused; type "not a link" → refused under the box; `demostudio.sg/privacy` → Save →
  "Links saved — clients see them at the foot of every page" · Undo; the row ticks "Linked at the foot of every page — demostudio.sg/privacy".
  ⌘K "pdpa" → *Privacy and terms*. The phone frame on the right shows the foot.
- **Germaine / Michelle (Designer), Hui Min (Admin):** a Designer reads the card, boxes disabled, no Save, no press on the row; Hui Min (Admin) changes it as Dane does.
- **The client (Benjamin, 9773 1968 + any six digits):** with links set, the sign-in page's foot and every page's foot — *Privacy · Contact*; each
  opens in a new tab. Give Germaine a photo (Your profile, as her) → Benjamin's Messages and Issues show her face; Dane's stays his initial; Kevin
  (9688 2109) doesn't get hers.
- **Unknown address:** `/my/someone-else/p/abc`, `/my/someone-else/team` → "This address doesn’t open a portal", the tab the same.
- **390 / 320:** the foot above the phone's bar, nothing sideways.

## Probes run (each on its own fresh copy of the repaired base — `pbuild/base.db` + migrate + repair — with `next start -p 3160`; stopped after)
| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s13.cjs`** (this step) | **65 / 65** — twice on fresh copies; a full `.dump` before and after a run is identical |
| `projects/verify-pj-r4a.cjs` (sign-in, Company › Client portal's checklist — "3 of 5" / "4 of 5", a deliberate change commented) · `verify-pj-r4b.cjs` | 73 / 73 · 75 / 75 |
| `projects/verify-pj-r9.cjs` (sections, welcome line, household) · `verify-pj-fix-F.cjs` (deep links, sign-in, notices) | 66 / 66 · 44 / 44 |
| `projects/verify-pj-gap-d.cjs` · `verify-pj-gap-h.cjs` (Messages, Issues, About's portraits) | 65 / 65 · 80 / 80 |
| `parity-map-build/verify-pm-f.cjs` (the portal) | 60 / 60 |
| `pending-modules/verify-pm2-s01.cjs` (photos; no studio picture address on the portal) · `verify-pm2-s02.cjs` (old links, cards) | 79 / 79 · 105 / 105 |
| `pending-modules/verify-pm2-s07.cjs` (the portal's credit) · `verify-pm2-s10.cjs` (Company › Client portal's Maison AI) | 89 / 89 · 107 / 107 |
| `global-search/verify-search.cjs` (a new Company card in ⌘K) | 27 / 27 |

`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 16 warnings are older files') · `npm run design:lint` nothing new ·
`npx next build` green.

## Migration and repair
- **No migration** — the links ride in `settings` under `portal_links` (beside `portal_welcome`); faces in `members.color` / `studio_pictures`,
  as S01 left them. No new table, so no baseline list changed.
- **Repair R115** — keeps a port's or tester's `portal_links` to web addresses (the app's own `parseFootLinks`) and puts back any member look
  stored in the portal's face form (made for a page, never stored); two checks in the closing list. On the demo: "no links at the foot of the
  portal yet — Getting it live asks for the privacy notice"; full repair: all checks pass. Exercised on a throwaway copy (a bare and a
  `javascript:` link, a `face:` look → cleaned; a second run changes nothing).

## For the next steps
- **S30 (signing in):** the portal's code step is ready for the real SMS — `requestCode` / `verifyCode` in `app/portal/actions.ts`; put 1.0's
  per-number / per-IP limit in front of the provider there, and keep the refusal words plain ("Too many tries — wait a minute and try again").
- **S34 (real services):** the portal's client messages already go through the outbox.
- **S31 (a new studio joins):** a second studio's portal address must resolve in `resolvePortalSlug` per studio; `lib/portal/meta.ts` and
  `lib/links/old-links.ts` `portalOf` already treat any other address as its own notice.
- **Developers:** `PortalDocument.previewHref` / `NeedItem.previewHref` (the studio's own addresses for a preview) still ride to a client's
  browser on a real client's visit, unused there (pre-existing; ids only, studio pages need a studio login in production) — a server could drop
  them for `!visitor.preview`.
- **Open for Vicky:** the foot on the other client links (`/confirm`, `/sign`, `/quote`, `/invoice`, `/receipt`)? Built on the portal only, as 1.0.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock for the foot, the card or the faces (the Client Portal Proposal draws no footer and names
   members only); built on the house pieces and logged (REG-S13.1…6, invented copy listed).
2. **One system, no one-offs** — the house text link, Card, TextField, Button, the snackbar's Undo, LeaveGuard, the ghost kit (`Line`, `Words`),
   the flag-pref ghost precedent (`PORTAL_RUNS_KEY`), `bringCardIntoView` / `useHashLanding`, the one Avatar (`avatarSrc`), `cleanLink`; tokens
   only, `design:lint` holds.
3. **Plain words for studio people** — "Privacy notice", "Add the link", "Linked at the foot of every page"; the PDPA reason in one sentence; the
   client reads 1.0's three plain words.
4. **Nothing is lost** — Save answers with Undo (the links before put back), Cancel and the leave guard keep an unsaved edit from vanishing.
5. **Say why** — the checklist row and the card say why a privacy notice matters; a bad address is refused under its own box; a Designer's boxes
   are disabled under the page's "Only Owners and Admins change the portal’s set-up."; an unknown address says it opens no portal.
6. **Back returns where you came from** — ⌘K's door lands on the card; the row's press scrolls to it on the same page; nothing new to go back from.
7. **Every screen is whole** — the Company ghost carries the fifth row and the new card; the portal's ghosts draw the foot once this browser has
   seen it; the sign-in ghost's foot now matches its page (fixed); the notices keep the studio's links.
8. **Every width is designed** — 1440 · 390 · 320 checked (no sideways scroll against `screen.width`, the foot above the phone's bar, 44-tall
   links under a finger); the card is the Welcome line's at every width.
9. **Tables follow the leads listing** — not applicable (no table).
10. **Motion with purpose** — the landing scroll is the house `bringCardIntoView` (smooth unless reduced motion); nothing new animates.
11. **Honest data** — the demo links no privacy notice (none exists), so the checklist says it is still to do; faces show only real photos of the
    client's own team; R115 keeps stored links to web addresses.
12. **Reach for everyone** — the foot is a labelled `nav` of real links; the boxes are labelled fields; the row's press moves focus into the first
    box; every new press works from the keyboard.
