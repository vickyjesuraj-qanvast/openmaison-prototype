# S30 · Signing in (+ Sign out's place) — outcome (2026-10-13, lane A)

Card: `onboarding:studio-sign-in` (recommendation "developers' lane"; three questions, taken as recommended — see *Decisions*). Built on an
**honest stand-in**: the screens, the flow and the records are real; the code is never sent and any six digits pass, and every page that
asks for one says so. Carried notes taken: **S09** (`acceptInvitationOf` on a first sign-in; 1.0's pending-invitation refusal; `joinStudio`
and "a joined link signs in again" replaced), **S08** (the welcome keys on the session member — `welcome_due` already said it; proved in the
probe), **S01** (a phone change now sends a code — decided yes), **S16** (Sign out's place), **S13** (the portal's code step — kept as S13
left it, see the ledger), **S10** (Recent follows the signed-in member — nothing to move), **S20** (the studio's picture routes behind
sign-in).

1.0 read: `src/app/login/page.tsx` (+ the Qanvast line's on `origin/integ/security-qanvast`), `src/app/api/auth/{login,verify,me,logout,
refresh,signup-status}/route.ts` (+ the Qanvast line's `login` · `verify`), `src/lib/{session,twilio,bypass-otp,rate-limit}.ts`,
`src/context/session-context.tsx`, `src/proxy.ts`, `src/lib/access-control.ts` `getDefaultRoute`, `src/components/layout/topbar.tsx`
(the profile menu's Sign out). Register rows: `steps/reg-S30.md` (REG-S30.1…12). Probe:
`design-source/verify/pending-modules/verify-pm2-s30.cjs` (**109 / 109**, on the repaired base and on one rolled to today's demo day; the scratch DB put back as found); shots in `design-source/verify/pending-modules/pm2-s30/`.

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| "Sign-in screen: mobile number with its country code, then a 6-digit code by SMS; resend after 30 s; paste the code" | **built** — `/sign-in`: "Mobile number or email" (a Singapore mobile with its **+65**, shown as you type digits and accepted typed; the work email as the second way in), then the 6-digit code — resend after 30 s, a paste (or the phone's autofill) fills the boxes. **Stand-in:** no SMS is sent and any six digits pass — said on the page ("Demo only — no text or email is sent: any six digits sign you in."). **Other countries' codes:** 1.0's country picker is S33's, on hold by him | `app/sign-in/*`, `components/auth/studio-sign-in.tsx`, `components/om/code-boxes.tsx`, `lib/auth/model.ts` · `provider.ts` |
| "Keep me signed in for 30 days (else 24 hours), renewed on each visit; Sign out" | **built** — ticked by default (1.0's): 30 days, renewed on each visit (cookie every page, record hourly); unticked 24 hours, not renewed (1.0's). **Sign out** is the You group's last row (studio block menu · the phone's You sheet): the session ends on the server, the browser forgets this tab's `om.*` and ⌘K's recents | `lib/auth/session.ts`, `proxy.ts`, `components/shell/view-as-popover.tsx`, `lib/auth/forget.ts`, `studio_sessions` |
| "Already signed in → straight to your home; signed out → every page goes to sign-in" | **built** — signed in, `/sign-in` (and 1.0's `/login`) go to the page asked for, else home (Accounting → Finance); signed out, every studio address goes to sign-in with `?next=` (pages) or answers 401 (files, pictures, saves); the client links stay open. **How the demo keeps working:** a browser that never signed in or out is the demo's own session (signed in as View as's member, Dane in the base) until it signs out — every existing probe opens pages exactly as before | `proxy.ts`, `lib/auth/paths.ts` (`DEMO_STANDING_SESSION`, `PUBLIC_PATHS`), `components/shell/app-shell.tsx`, `app/(editor)/layout.tsx`, 14 studio route handlers |
| "Unknown number: 'No account found' with Sign Up — or 'Contact support for account setup' while sign-ups are paused; a pending invitation says so" | **built** — "No account found with this number" (1.0's; "…with this email") with who to ask under it; **a pending invitation says so**: an open one — the code step says this sign-in joins the team, and the code accepts it (1.0's verify route); one that ran out — "Your invitation has expired — ask your studio to send you a new one". **Sign Up → S31** (the next step in this lane; the door sits where the "No account found" help is). **Sign-ups paused** is Platform admin's switch — **parked by him** (Platform admin excluded) | `app/sign-in/actions.ts`, `lib/auth/model.ts` `SIGN_IN` |
| "Repeated attempts slowed down; staff can set a temporary test code for demos" | **built** — five tries a minute per number or email, for asking a code and for checking one (1.0's figures; counted per number since every tester shares one address; in memory as 1.0's was) — "Too many tries — wait a minute and try again". **Test code: stand-in** — the stand-in's "any six digits" is the demo's code; a staff test code for a real provider (1.0's 72-hour bypass OTP) is set in Platform admin — **parked by him** (excluded); it belongs inside the provider's `checkCode` (the seam says so) | `lib/auth/limit.ts`, `lib/auth/provider.ts` |
| "Sign in with a Qanvast account: studio and member created on first sign-in, the role taken from Qanvast; 'Your Qanvast session expired' when that link times out" | **stand-in (the seam, honest)** — the same screen; Qanvast is a provider behind it: `provision(contact)` makes the member on a first sign-in with Qanvast's role (`roleFromQanvast`: company Admin → Owner, else Designer — 1.0's); making the **studio** on a first sign-in is S31's. "Your Qanvast session expired" is built as the page's notice (`?reason=qanvast`, shown even over a live session — 1.0's escape); nothing in the prototype talks to Qanvast, so nothing sends a member there yet | `lib/auth/provider.ts`, `app/sign-in/actions.ts` `addProvisionedMember`, `lib/auth/model.ts` `SIGN_IN_NOTICE` |
| *(S09's note)* call `acceptInvitationOf(memberId)` on a member's first sign-in; `joinStudio` moves View as's flag and a joined link signs that member in again — replace both; 1.0's "You have a pending invitation" is S30's | **built** — sign-in and the invitation's page both accept on the first code; the invitation's page asks for the code before Join (to their mobile, else their email); a joined link signs in with a code, or opens the app on the browser that is theirs; S09's "until sign-in arrives" caption is gone | `app/join/actions.ts`, `components/company/join/join-page.tsx`, `lib/company/invitations-server.ts` |
| *(S08's note)* the welcome keys on the session member | **kept — nothing to change**: signing in moves `is_you`; an invited member's first sign-in opens their welcome (probe §7 · §8) | — |
| *(S01's note)* a phone change sends no confirmation code until sign-in exists — decide whether the code step now covers it | **built** — decided yes: a save that adds a sign-in key (a new mobile, else a new email) is confirmed by its code first; losing both is refused | `components/profile/confirm-contact-dialog.tsx`, `app/company/members-actions.ts` (`sendMyContactCode`, `saveMemberDetails`) |
| *(S16's note)* Log out's place — the studio block's menu / the phone's You sheet, under Open to new leads | **built** — "Sign out" (1.0's and the portal's word) | `components/shell/view-as-popover.tsx` |
| *(S13's note)* the portal's code step `requestCode` / `verifyCode` — put 1.0's per-number / per-IP limit in front of the provider there | **kept, with S13's reason** — the portal's stand-in sends nothing and checks nothing, and its probes sign the same clients in many times a minute; the limiter (`lib/auth/limit.ts`) and the provider seam are ready for it with the real SMS (S34). Its code boxes are the house piece now | `components/portal/portal-sign-in.tsx` |
| *(S10's note)* Recent is per member via `fetchViewer()` | **kept — nothing to move** (it follows the signed-in member) | — |
| *(S20's note)* the picture routes go behind the session | **built** — a signed-out request to a studio picture or file answers 401 before any rule is asked; a client render picture (`?t=`) and the studio's fonts stay public | 14 route handlers, `signedOutResponse` |

## Found and fixed on the way
- **The demo's own session for any flagged member** — S08's probe flags a deactivated member as "you" by SQL (View as never can); the first
  cut sent that browser to sign-in ("deactivated"). The demo's own session is now whoever the flag names, exactly as before sign-in; only a
  session started with a code checks the member is active.
- **A build's prerender** — reading the cookies inside a `try` swallowed Next's dynamic-render signal, so a layout queried the build's empty
  database; the session read never catches it now (builds take `DATABASE_URL=file:<scratch>`, as the lanes' always did).
- **The way back never carries the router's `_rsc`** cache-buster (a client navigation's address), and the who-to-try line keeps a mobile
  number on one line (`9111 2233` broke at 320).
- **Not S30's — for the orchestrator / S42:** `projects/verify-pj-r4a.cjs` ("What needs you first: the floor plan shown an hour ago") and
  `verify-pj-fix-F.cjs` (F-06 · F-24, the same "new file" row) fail one check each on today's demo data because of the data's age (nothing this step touches reads it): Benjamin Han's floor plan
  was shown on **5 Oct** in the fixture (`lead_files.shown_to_client_at`, written as `NOW - H` by the repair's `INSERT OR IGNORE` once), the
  portal's "new file" row lasts 7 days (`NEW_FILE_DAYS`), and a restore moves only tasks and the credits month (REG-341) — so the row aged
  out on 12 Oct. Every other check of both probes passes (the portal's sign-in included); the fix is the demo data's (a repair that keeps that
  file "shown an hour ago", or the restore shifting `shown_to_client_at`), outside this card.

## Found in 1.0, not on a card
- **1.0's `auth_sessions` analytics** (`session_started` / `session_ended` events for usage) — the record itself is built (`studio_sessions`
  keeps every start and end); the usage events belong with Studio Health (S35–S41) — **for S41b**.
- **"by proceeding you agree to the terms & conditions"** under 1.0's sign-in (its link went nowhere) — OpenMaison's own terms come with the
  marketing site (S35) — **for S41b**; the sign-in page shows nothing until there is a page to link.
- **1.0's test numbers** (91234001–91234040 never sent an SMS, `PHONE_OVERRIDE` sent every code to one phone) and the durable,
  token-scoped limiter (`checkDurableRateLimit`) — **developers'** (the real provider, S34).
- **`/admin/login`** (Platform admin's own sign-in) — parked by him (Platform admin excluded).
- **The Qanvast line's `/api/auth/refresh`** (Qanvast token refresh) — with the Qanvast provider (developers').
- **The scaffold's `users` table with `password_hash`** (2.0's own, from before the mocks; never read) — not a password store; sign-in
  never touches it. Developers may drop it.

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
1. **The card's three questions:** (a) *Qanvast account, own number, or both?* — **both**: the studio's own number or email on this one
   screen; Qanvast is a provider behind it (the seam), the card's "developers' lane". (b) *Does View as stay in the live product?* — **for
   demos**: it stays, labelled Demo only, and goes with `DEMO_STANDING_SESSION` in a real build. (c) *Reuse the portal's phone + code
   screen?* — **yes**, composed (its stylesheet, its code boxes made the house piece).
2. **How the demo keeps working:** a browser that never signed in or out is the demo's own session (View as's member). Signing in moves
   `members.is_you` (one identity per database, REG-667's model — each tester runs their own), so nothing that reads the signed-in member
   changed. A signed-out browser is the only one that sees sign-in.
3. **Email as a second way in** (1.0: mobile only) — a member may be added with an email only (S09), and Dane has no mobile on record.
4. **A pending invitation joins on sign-in** (1.0's verify route) rather than refusing "join first" — in 1.0 that refusal fired only when no
   account existed yet; in 2.0 the member exists from Add member. The expired case keeps the refusal.
5. **Deactivate signs a member out everywhere**; Undo brings the member back, not the sessions.
6. **The word is "Sign out"** (1.0's, the portal's), not "Log out".
7. **The gate in layers** (1.0's proxy, plus Next 16's advice): `proxy.ts` on cookies before any route; the shell for what only the record
   knows; each studio file route answers 401 itself. The stand-in does not make every Server Function ask the session (they read `is_you` as
   before) — `requireStudioMember()` is the one call production adds to each (said plainly here and in `lib/auth/session.ts`).
8. **The portal's limiter stays S13's call** (above).

## The one seam for the real provider
**`lib/auth/provider.ts` — `setSignInProvider({ sendCode, checkCode, provision? })`** (beside the outbox's `setDeliveryAdapter`): the
sign-in page, the invitation's page and Your profile's number check all ask it. With it: `DEMO_STANDING_SESSION = false`
(`lib/auth/paths.ts`), Secure cookies, a shared limiter with the visitor's real address, `requireStudioMember()` in each studio Server
Function, and `sessionMemberId()` reading the session instead of `is_you` (lib/db/session.ts says where).

## What to check in the browser
- **Dane (Owner), 1440:** the studio block (bottom of the rail) › the You group ends with **Sign out** › sign-in says "You’ve signed out." ›
  open `/leads` → sign-in with `?next=/leads` › `dane@demostudio.sg`, Send me a code › any six digits › back on Leads. Untick *Keep me
  signed in* for a 24-hour session. Try `81234567` (No account found + who to ask), `6222 0188` (a landline), and six sends of one number
  (Too many tries).
- **Sarah (Designer) by mobile `9883 7542`**, **Priya (Accounting) `9182 7364`** → Finance.
- **Invitations:** Company › Members › Add member (a mobile) → open the invitation link (Copy link) in another browser → *Join Demo Studio*
  asks for the code first; or sign in with the new member's number — the code step says it joins the team; the welcome follows.
- **Your profile:** add a phone → *Confirm your new number* → any six digits → saved; clear both phone and email → refused.
- **Deactivate** a member who signed in on another browser → their next page says their account is deactivated.
- **390 touch:** the top bar's avatar › You › Sign out; sign-in and the code step fit at 390 and 320.
- **Reset prototype to base** → the browser is Dane again, signed in.

## Probes run (lane A, :3160, scratch copies of pbuild/base.db migrated + repaired)
| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s30.cjs` (this step) | **109 / 109** (base) · **109 / 109** (rolled to today) |
| `pending-modules/verify-pm2-s01.cjs` (Your profile — the You group's profile row by its id; a new mobile now confirms its code — two deliberate changes, commented) | 80 / 80 |
| `pending-modules/verify-pm2-s09.cjs` (Join's code step — deliberate changes, commented) | 79 / 79 |
| `pending-modules/verify-pm2-s08.cjs` (the welcome, set-up) | 70 / 70 (after the standing-session fix, *Found and fixed*) |
| `pending-modules/verify-pm2-s13.cjs` (the portal's sign-in, now on the house code boxes) · `verify-pm2-s16.cjs` (the You group) | 65 / 65 · 56 / 56 |
| `pending-modules/verify-pm2-s14.cjs` · `verify-pm2-s18.cjs` | 69 / 69 · 63 / 63 |
| `projects/verify-pj-r4a.cjs` · `verify-pj-fix-F.cjs` (the portal) | 72 / 73 · 43 / 44 — the one each is the demo data's aged "new file" row, not this step (*Found and fixed*, last item) |
| regression runner, :3160 — `view-as` · `ghosts-same` · `ghosts-same-390` · `first-run-ghosts` · `first-run-empty` · `first-run-noleads` · `first-run-full` | 23 · 57 · 57 · 15 · 89 · 5 · 6 — all green (`panel-order` · `ghosts-strips` · `ghosts-measure` measure and print, no failures; `ghosts-film` takes keys by hand) |
| regression runner — `search` · `kb-r1` · `kb-r2` · `overlays` · `st-r1` · `st-r2` · `ct-r1` · `qe-r1` · `sw-r1` · `sw-r4` · `folders-files` · `viz-studio` · `viz-client` · `dane-int` · `xr-r1` · `pb-r1` · `ux-p3` · `ux-p6` · `cr-r1` | 27 · 35 · 29 · 67 · 57 · 30 · 36 · 34 · 34 · 35 · 16 · 37 · 30 · 6 · 27 · 18 · 91 · 57 · 59 — all green |
| `tsc --noEmit` · `eslint app components lib proxy.ts` · `design:lint` · `design:anatomy` · `next build` (`DATABASE_URL=file:<scratch>`, under the lock) | clean · 0 errors (16 warnings, none in this step's files) · nothing new · 1699 measures hold · exit 0 |

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — no mock for sign-in: composed from the portal's sign-in (the card's own pattern) in
   OpenMaison's frame; every invented line in REG-S30.1…7; flags below.
2. **One system, no one-offs** — the portal's sign-in stylesheet composed, the code boxes made one house piece (portal, studio, invitation,
   profile), the house Dialog, `TextField` (+65 as its `leading`), DS `Checkbox` and `Button`, the read-only note's tint for the notice, the
   ghost kit (`GhostSheet` · `Bone` · `Words`), `couldnt`, `leaveThen`, the menu row of the You group; `design:lint` holds.
3. **Plain words for studio people** — "Mobile number or email", "Send me a code", "Keep me signed in for 30 days", "No account found with
   this number", "Your session ended. Sign in again to carry on.", "Confirm your new number", "Sign out".
4. **Nothing is lost** — signing out keeps the device's preferences; a page asked for while signed out is where sign-in returns; deactivating
   keeps the member (Undo); the record of every session stays (ended, with its reason).
5. **Say why** — every refusal says what to do (ask the Owner, wait a minute, a mobile not a landline); the page's notice says why it is
   showing (signed out · the session ended · deactivated · Qanvast).
6. **Back returns where you came from** — `?next=` brings a signed-out visit back to its page (inside the app only); Sign out lands on
   sign-in, which leads home.
7. **Every screen is whole** — sign-in has its layout (snackbar host), loader and reveal drawing one ghost (probe: head, notice, form and
   foot within 4–6 px at 1440 · 390 · 320), errors inline with `role=alert`, the notice `role=status`.
8. **Every width is designed** — 1440 · 390 · 320 checked (no sideways scroll against `screen.width`; code boxes 56 tall); the phone's You
   sheet carries Sign out.
9. **Tables follow the leads listing** — not applicable (no table).
10. **Motion with purpose** — the house reveal only; nothing new moves.
11. **Honest data** — every state comes from a record (`studio_sessions`, `studio_invitations`, `members`); R120 keeps them in step; the
    stand-in is named on every page that asks for a code; nothing claims a message was sent.
12. **Reach for everyone** — labelled field, a fieldset and legend for the code with "Digit n" boxes, ↵ submits, ← → / Backspace walk, focus
    moves to the field and then to the first box once the ghost lets go, one-time-code autofill, 56-px boxes on a phone.
- **How to add a missing thing:** one home (sign-in is a page in its own right; Sign out joins the You group S16 named); shown only when it
  applies (the notice only with a reason, the hint only for the stand-in, the join line only for an open invitation); **one filled button**
  per step; defaults that need no set-up (the demo opens as before, Keep me signed in ticked).

## Flags for Vicky
- **No mock** for the sign-in page — the portal's sign-in composed in OpenMaison's frame (the card said only this one screen needs his design).
- **"Sign out"**, not "Log out" (1.0's and the portal's word).
- **Email as a second way in** (1.0 had the mobile only).
- **A pending invitation joins on sign-in** instead of refusing "join first" (1.0's verify accepted it; the refusal is kept for an expired one).
- **Your profile asks for a code** when a save adds the number or email you sign in with — one more step.
- **The demo's who-to-try line** names the Owner's mobile or email on the sign-in page (demo only).

## Shared pieces changed
- **New house piece** `components/om/code-boxes.tsx` (+ `.module.css`); the portal's sign-in now uses it — its four code-box rules moved out of
  `components/portal/portal.module.css` (pixel-identical: the focus ring reads the primary, which the portal maps to its studio's colour);
  `focusWhenLive` exported from `components/portal/portal-sign-in.tsx`.
- **The shell:** `components/shell/app-shell.tsx` and `app/(editor)/layout.tsx` ask `requireStudioSignIn()` first;
  `components/shell/view-as-popover.tsx` gained the Sign out row.
- **`proxy.ts`** at the root (new) — every request but Next's own files and the public folder's.
- **Icon fonts:** `public/fonts/material-symbols-{rounded,outlined}.subset.woff2` + `ICONS.txt` gained `logout` (every other glyph
  pixel-identical; rebuilt from the same 2.972 source — npm `material-symbols@0.47.5`).
- `app/leads/actions.ts` `resetPrototype` clears this browser's sign-in cookies; `app/view-as-actions.ts` keeps a session record in step.

## Migration and repair
- **Migration 0104** `studio_sessions_s30` — one new table (`studio_sessions`, an index on `member_id`), additive, schema-only; added to
  `BASELINE_TABLES` (lib/db/baseline.ts) and `TABLES` (scripts/snapshot-baseline.ts) after `studio_invitations`. The base carries none.
- **Repair R120** — writes nothing on the demo ("no live sessions — the demo opens as its own session (Dane)"); ends a live session of a
  deactivated or departed member; four checks (whose member is gone · live for a deactivated member · an end with no reason the app knows or
  a reason with no end · ends before it starts / an unknown way in). Full repair: all checks pass. **Next free in lane A: R121.**

## For the next steps
- **S31 (A new studio joins, this lane):** the Sign Up door goes where `SIGN_IN.noAccountHelp` sits (`requestSignInCode` answers
  `noAccount: true`); a new studio's Owner signs in through `startStudioSession`; its `provision` case (the Qanvast line making a studio) is
  yours; sign-ups paused is Platform admin's (excluded).
- **Lane B / the orchestrator:** a **new client-facing address** (Hangouts' `/hangouts/...`, a portfolio link…) must be added to
  `PUBLIC_PATHS` in `lib/auth/paths.ts` — otherwise a signed-out browser is sent to sign-in there (a fresh browser is not, so its probes
  would still pass). A new studio file / picture route should start with `signedOutResponse()`.
- **S34 (real services):** `setSignInProvider` (Twilio Verify or Qanvast), the portal's `requestCode` / `verifyCode` through the same
  provider and `takeTry`, a durable limiter, Secure cookies, the real visitor address.
- **S41b:** 1.0's session analytics (Studio Health) and the sign-in page's terms line (with the marketing site).
- **UAT:** step 1.10 added to `design-source/uat/story/ch1.json` — rebuild the workbook (`build_uat.py`); the testers' sheet tabs are Vicky's.
