# S01 · Your own profile — outcome (2026-10-11)

Cards: `onboarding:my-profile`, `api:my-account-profile`, the profile lines of `held:settings-company` and `held:shell`. 1.0 read:
`src/app/(main)/settings/page.tsx` (Your Profile · My Signature), `src/app/api/identity/profile/route.ts`, `src/lib/queries/studio.ts`
(`useUpdateProfile`), `src/components/settings/member-signature-card.tsx`, `src/components/layout/topbar.tsx` (the profile menu).
Register rows: `steps/reg-S01.md` (REG-S01.1…10). Probe: `design-source/verify/pending-modules/verify-pm2-s01.cjs` (**79 / 79**); shots banked in `design-source/verify/pending-modules/pm2-s01/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| my-profile · Change your own name, email and phone | **Built** — Your profile (`/profile`), Discard · Save changes, the leave guard, the house messages; always the signed-in member's own row (`saveMyDetails` resolves the viewer; the page never sends an id — 1.0's rule) | `app/profile/*`, `components/profile/your-profile-view.tsx`, `app/company/members-actions.ts` (`saveMemberDetails` · `saveMyDetails`), `lib/company/your-profile.ts` |
| my-profile · The same phone or email can't belong to two members | **Built** — name, email and phone checked against every other member (deactivated too) on every save and at Add member (`detailsClash`); 2.0 checked only the email, only at Add member | `lib/company/member-rules.ts`, `addMember` |
| my-account-profile · A page where I change my own name, email, phone and photo | **Built** — as above, with the photo row | `components/company/member-details-fields.tsx`, `member-photo-field.tsx` |
| my-account-profile · A member's own uploaded photo | **Built** — saved (1.0 never saved it: "Preview only — not saved"), on every avatar the studio draws, taken off back to the tint; one photo = the About › Our team portrait | `lib/company/member-photo.ts` (pure: the look vocabulary), `lib/company/member-photo-store.ts` (server), `components/om/avatar.tsx`, the two comment avatars, `app/company/about-actions.ts`, `lib/portal/about.ts`, repair R103 |
| my-account-profile · My signature as a card on that page | **Built** — Your signature: the quote's own face (`SignatureBox`, exported from the quote editor), Change through Signature Settings, Remove with Undo | `components/quotes/editor/signature/signature-section.tsx`, `app/quotes/signature-actions.ts` (`removeMemberSignature`) |
| settings-company · Edit a member's name, email, phone, photo | **Built** — Company › Members: a pencil beside each name; Edit details for Owners and Admins (an Owner's, only an Owner), Undo after a save; your own pencil opens Your profile. The About page dialog keeps an Owner's photo the same way (it is his avatar too: the row says why, the server refuses) | `components/company/members-view.tsx` (+ `.editForm` · `.pencil`), `detailsBlock`, `member-portal-dialog.tsx` (`photoLocked`), `setMemberPortal` |
| settings-company · My signature as its own card | **Built** (the line above) | — |
| shell · The phone top bar's avatar — Coming soon | **Built** — the member's own avatar; opens the studio block's menu as the "You" sheet (Your profile, then View as) | `components/shell/mobile-nav.tsx` (+ css), `components/shell/view-as-popover.tsx` (`profile`) |
| 1.0 · the studio name read-only | **Built** — the role line ("You're an Owner at Demo Studio …") | your-profile-view |
| 1.0 · the phone normalised (E.164, region-aware) | **Kept as 2.0 does it** — Singapore's 8 digits (`isSgPhone`); other regions are DEF-30 (S33) | — |
| 1.0 · My Signature › "Auto-apply on approval" | **Not done here** — the consent before a member's signature is applied is S03's line (`held:contracts`); the card shows the signature as quotes print it today | — |
| 1.0 · a sign-in number change (no code sent in 1.0 either) | **Stand-in, honest** — the phone saves as typed; when sign-in comes (S30, the developers) a code to the new number should confirm it. Nothing on screen claims a code | — |
| 1.0 · the profile menu's Settings / Accounts Setup / Sign out | **Kept** — Settings and Company are the rail's; Sign out comes with sign-in (S30) | — |

## Files
New: `app/profile/{layout,page,loading,error}.tsx`, `components/profile/{your-profile-view,your-profile-ghost}.tsx` + `your-profile.module.css`,
`components/company/member-photo-field.tsx` (+ css), `components/company/member-details-fields.tsx`, `lib/company/{member-photo,member-photo-store,your-profile}.ts`,
`design-source/verify/pending-modules/verify-pm2-s01.cjs` (+ `pm2-s01/` shots). Changed: `components/om/avatar.tsx`, the two comment avatars
(`components/leads/tasks/comments-panel.tsx`, `components/leads/files/file-comments-panel.tsx`), `components/company/{members-view,member-portal-dialog,company-shell}.tsx`
(+ the members and portal-dialog css), `components/shell/{view-as-popover,mobile-nav,app-rail}.tsx` (+ css), `components/quotes/editor/signature/signature-section.tsx`
(`SignatureBox` exported, the quote's DOM unchanged), `app/company/{members-actions,about-actions}.ts`, `app/quotes/signature-actions.ts`, `lib/company/member-rules.ts`,
`lib/settings/{permissions,roles}.ts`, `lib/global-search/model.ts`, `lib/nav.ts`, `lib/portal/{about,threads}.ts`, `lib/projects/messages.ts`,
`app/portal/messages-actions.ts`, `scripts/repair-demo-data.ts` (R103).

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- Where "My account" lives (api card's question): **behind the studio block's menu and the phone's avatar, as its own page** — not a Settings
  module (Settings is the studio's rules). ⌘K finds it.
- Whether an Owner or an Admin may correct another member's details (both cards' question): **yes, on Company › Members › Edit details**;
  an Owner's only by an Owner (the house Owner rules — a phone will be how a member signs in).
- **One photo per member** — the avatar and the About portrait are the same picture (Members › About page edits it too).
- A signature can be **removed** (1.0 had Remove), with Undo.
- Open to new leads, lead preferences and PayNow **stay on the member's row on Members** (one home); Your profile has a door to it.
- The rail's "Demo Studio · Dane Bruce Lee" lines stay as REG-329 set them (the studio's corner, not "you"); the phone avatar's label keeps
  "Dane Bruce Lee" for Dane ("You — Dane Bruce Lee").

## How the photo travels (for the developers)
`members.color` was already the avatar's look (a tint, or `photo` = the demo's fixed portrait). A member's own photo is
`photo:<studio_pictures.id>|<the look under it>`; `avatarSrc(look)` gives the picture, `lookUnder(look)` the tint. Every writer goes through
`photoColumns(look, pictureId)`, which also keeps `members.portal_photo_id` (gaps build H's About portrait) on the same picture. Pictures are
never deleted (a replaced or removed one keeps its row, so Undo can put it back; `isOwnPicture` guards an Undo's id). Client pages never get
the studio's `/company/picture/` address: `forClient()` (portal messages, issues, teams) and `lookUnder` (About) give them the tint; About ›
Our team serves the portrait through `/my/[slug]/about/picture/<id>`. When 1.0's `profiles.avatar_url` is ported, store the picture and write
the look the same way (or replace the vocabulary with a real column and thread it — the one place to change is `avatarSrc`).

## What to check in the browser (production build, 1440 and 390)
- **Dane (Owner)**: the rail's Demo Studio block → the menu leads with "Dane · Your profile" → Your profile. Change the name, Save; the
  listing, Members and every avatar follow. Add a photo (a .txt is refused under the row), Save → his avatar is the photo everywhere; Take it
  off → his blue initial. Email `sarah@demostudio.sg` → "Couldn't save your details — another member has that email". Your signature → Change ·
  Remove (Undo). Company › Members → the pencil beside Sarah → Edit Sarah's details → Save → Undo. His own pencil → Your profile, Back to Members.
- **Hui Min (Admin)**: Members → Dane's pencil says "Only an Owner changes an Owner's details" and opens nothing; Sarah's opens.
- **Germaine / Michelle (Designers)**: Members shows only their own pencil; Your profile is theirs ("You're a Designer at Demo Studio").
- **Priya (Accounting)**: Your profile opens (from ⌘K or the block) — no signature card, no door to Members.
- **390**: the top bar's avatar is the member's own (Dane: a blue "D") → the "You" sheet → Your profile; Members › Edit details is a sheet.
- The client portal (Benjamin, 9773 1968 + any six digits): About › Our team shows Germaine's photo once she has one; no page carries a
  `/company/picture/` address.

## Probes run
| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s01.cjs` (new) | 79 / 79 (the page error log empty; it puts back every member and picture it changes — diffed) |
| `view-as/verify-view-as.cjs` | 23 / 23 |
| `view-as/verify-panel-order.cjs` | View as 304 · Company 304 · Tools 318 in both stylesheet orders (no tally lines) |
| `settings-parity/verify-st-r1.cjs` · `verify-st-r2.cjs` | 57 / 57 · 30 / 30 |
| `uat-dane-2026-10-01/P3` · `P2b` | 71 / 71 · 56 / 56 |
| `ux-build-2026-09-30/P6` · `P7` (search's Settings and Company cards) | 57 / 57 · 94 / 94 |
| `global-search/verify-search.cjs` | 27 / 27 |
| `ai-credits/verify-cr-r1.cjs` · `verify-cr-r5.cjs` (View as's plan group) | 59 / 59 · 16 / 16 |
| `quote-templates-parity/verify-tpl-parity.cjs` | 20 / 20 |
| `ghosts/verify-ghosts-measure.cjs` on Company › Members | every row Δ 0 (the pencil first grew each row 2px — fixed) |
| `projects/verify-pj-gap-h.cjs` (About page, members' portraits) | 80 / 80 (a first run had 79 / 80 — "Messages ?compose=1: the composer is focused", a timing line in Messages, untouched here; green on the rerun) |
| `projects/verify-pj-r3.cjs` · `verify-pj-r8.cjs` | 90 / 90 · 67 / 67 |
| `reports-in-company-2026-10-08/verify-reports.cjs` | 41 / 41 |
| `parity-map-build/verify-pm-i.cjs` (View as Priya, Accounting's gate) | 54 / 54 |

Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate + repair) with `next start -p 3160`; :3160 stopped after.
`npx tsc --noEmit`, `npx eslint app components lib` (0 errors; the 9 warnings are older files'), `npm run design:lint` (nothing new) green.

## Migration and repair
- **No migration** — the photo rides in `members.color` and `studio_pictures` (both existed); no new table, so no baseline lists changed.
- **Repair R103** (`scripts/repair-demo-data.ts`) — an About portrait set before S01 becomes the avatar too, a look carrying a photo puts it on
  the About column; idempotent ("every photo already one" on the demo). Three checks: a photo whose picture is gone or someone else's; an
  About portrait that is not the member's photo; two members with one name, email or phone. Full repair: all checks pass.

## For the next steps
- **Quotes read their preparer live** (name, email, signature): a rename or a removed signature reaches quotes already sent — as Change
  already did. S03 (signature consent, values frozen at signing) / S04 should decide whether a sent or signed quote keeps a copy.
- **Accounting can't set their own PayNow** (it lives on Members, which isn't theirs to open) — pre-existing; S14 could add "Your PayNow" to
  Your profile.
- The portal shows a studio member's tint, not their photo, outside About › Our team — S13 could serve a client's own team's photos through
  the portal's address.
- No unique index on `members.email` / `phone` (1.0 checked in the route too; a migration could fail on a tester's copy) — the developers may
  add one once real data is clean.
- `MembersData` still hands every member's phone to every viewer (pre-existing; colleagues' numbers are not secret in 2.0 today).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock for Your profile; built on Company › Profile's shape and logged (REG-S01.1…10, invented
   copy listed); the phone avatar's change from the mock's stock photo is written down as deliberate (REG-S01.6).
2. **One system, no one-offs** — house pieces only (CompanyShell, the cards' stylesheet, TextField, Dialog / Sheet, IconButton, Tooltip,
   LeaveGuard, the ghost kit); the About dialog's photo row became the one `MemberPhotoField`; the quote's signature face is shared
   (`SignatureBox`); tokens only — `npm run design:lint` holds (nothing new).
3. **Plain words** — "Your details", "Your signature", "Another member has that phone number"; refusals in the rule's words through `couldnt`.
4. **Nothing is lost** — Remove (signature) and Edit details answer with Undo; replaced photos keep their pictures; unsaved edits ask first
   (the leave guard); a refused save keeps what was typed.
5. **Say why** — a refused pencil says the rule in its tooltip and label; a refused file says why under the row; duplicates name the clash.
6. **Back returns where you came from** — Members → Your profile carries `?from=` (Back to Members); Your profile → Members carries it back
   ("Back to Your profile"); rail-reached pages stay L1.
7. **Every screen is whole** — shell, L1/L2 header, `loading.tsx` + PageReveal drawing one ghost (probe: the ghost's cards sit on the page's
   at 1440 and 390), `error.tsx` (RouteError), tooltips on the icon-only pencils, snackbar host, Maison AI.
8. **Every width is designed** — 1440 · 768 · 390 · 320 checked; the details grid folds to one column ≤767, dialogs and menus are sheets on a
   phone; no sideways scroll at 390 or 320 (measured against `screen.width`); 24 pencils take the 44 touch overlay.
9. **Tables follow the leads listing** — not applicable (no table added; the Members list is unchanged in layout).
10. **Motion with purpose** — no new motion; the house dialog / sheet / menu timings.
11. **Honest data** — every state from the records (the role line, the photo's picture row, the signature); R103 keeps the avatar and the About
    portrait one picture, with checks; no seeded photos.
12. **Reach for everyone** — the menu's Your profile row is a `menuitem` in the arrow walk; pencils are buttons with names; the refused one
    stays focusable (`aria-disabled`) so its reason can be read; the phone avatar has a name and `aria-haspopup`.
- **How to add a missing thing** — one home (Your profile behind the block / avatar; another member's details on their Members row, never a
  copy); shown only when it applies (no signature card for Accounting, no pencils for a Designer on others); one filled button (Save changes);
  no set-up needed (the demo works as it is; a studio that never opens it loses nothing).
