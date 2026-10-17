# S36 · Try the AI Visualizer without an account — outcome (2026-10-13, lane A)

Cards: `public:try-it-visualizer` and `onboarding:try-visualizer-public` (both "skip" in the survey; built on her "build all of them"
2026-10-11, the public card's question taken as recommended — *Decisions*). **The AI Visualizer, for someone with no account, on OpenMaison's
website: `/site/try` and six landing pages.** A visitor uploads a room photo (HEIC on every browser) or opens a sample room, then works **in
the studio's own editor** — the same canvas, markers, versions, five modes and panels, Describe a change and Generate, the same code (the
editor's room logic moved into a shared module the trial runs too) — over the whole screen: style · materials (tap a surface) · lighting ·
furniture · defurnish (Empty the room) · sketch (Render from sketch), Compare, Download. **1.0's limits from 1.0's code: three renders per
browser**, asked of the server before and counted after (a signed, httpOnly cookie, a day from the last render), **ten a minute from one
address**; **every picture stamped with 1.0's mark** before it is shown or saved; **1.0's gate** (Start your studio · Book a demo) where
Generate was; **the visitor's own photo comes with them** into the studio they start. Nothing calls a model: the curated engine draws in the
browser, and the photo never leaves it. **Off unless switched on** (1.0's `TRIAL_VISUALIZER_ENABLED`) — **on in this prototype's demo**.
Turnstile and a lasting rate-limit store are the developers' seams.

1.0 read (branch `integ/security-non-qanvast`, 5d177c233): `src/app/try-visualizer/**` (layout, the root and six tool pages with their
metadata), `src/components/trial-visualizer/**` (all nine: `trial-visualizer.tsx` the state owner, `trial-canvas`, `trial-panels`,
`trial-results`, `trial-signup-gate`, `trial-start`, `trial-tool-content`, `trial-tool-marketing`, `trial-types`), `src/app/api/demo/visualizer/
{quota,detect,segment,render,photorealistic,declutter}/route.ts`, `src/app/api/demo/restyle/route.ts`, `src/lib/render/{trial-gate,trial-quota,
openmaison-mark}.ts`, `src/lib/rate-limit.ts`, `src/lib/hmac-verify.ts`, `src/app/(marketing)/try/*` + `src/components/landing/visualizer-demo.tsx`
(the older demo), `src/components/landing/v2/module-template.tsx` (the Try Now), `src/proxy.ts` (its public prefix), `public/logo-full-mono.svg`,
`src/__tests__/trial-{anonymous-routes,gate,quota,watermark}.test.ts`, `docs/superpowers/specs/2026-08-21-public-visualizer-trial-design.md`,
`docs/superpowers/plans/2026-09-14-trial-visualizer-rebuild.md`, `docs/features/visualizer-public-demo/spec.md`, `docs/rules/{tools,database-auth}.md`.
Register rows: `steps/reg-S36.md` (REG-S36.1…12). Probe: `design-source/verify/pending-modules/verify-pm2-s36.cjs` — **109 / 109** (+ **9 / 9**
with the switch off); shots in `design-source/verify/pending-modules/pm2-s36/` (with `s36-download.jpg`, a downloaded render and its mark).

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| (public) "The anonymous trial editor: upload or sample → style / materials / lighting / furniture / defurnish / sketch, with before/after and download" | **built** — the start (upload · Take a photo on a phone · three sample rooms · the live before / after · six tool cards) and **the studio's own editor** over the screen: Style (25 looks; a sample's own five finished looks), Surfaces (tap a square or a group, the material picker, your own swatch), Lighting (six presets, the advanced knobs, the live preview), Furniture (Remove · Customize · Replace's honest line), Tools (Empty the room — keep built-ins / strip to shell — and Furnish), Render from sketch on the sample sketch, Describe a change; Compare (before / after on the stage), the versions, Download; ⌘Z / ⇧⌘Z, ← → through the versions | `app/site/try/**`, `components/visualizer/trial/{trial-visualizer,trial-start,trial-editor,trial-open,trial-ghost,trial-marketing}.tsx`, `components/visualizer/editor/{room-session,picture-reader}.ts` |
| (public) "3 free renders per browser, a watermark on every result, a sign-up gate at the end" | **built** — 3 (1.0's `TRIAL_LIMIT`, settled from its code — see *Decisions*), counted on the server in a signed, httpOnly cookie scoped to the trial (`om_trial`, a day from the last render), asked before each render and counted only when it is kept; plus 1.0's ten a minute from one address. **1.0's mark** (its white logo, its size and place) on every picture before it is shown or saved — and on a live light preview; a picture that can't take it is never shown (stricter than 1.0). **1.0's gate** in place of Generate after the third (Start your studio · Book a demo), its soft ask after the first, a reload keeps it, a second tab is refused by the server | `lib/visualizer/trial/{policy,server,watermark}.ts`, `app/site/try/actions.ts`, `trial-editor.tsx` |
| (public) "Six per-tool landing pages with their own search-engine copy" | **built** — `/site/try/{style, materials, lighting, furniture, defurnish, sketch}`: 1.0's titles and descriptions (in the site's "\| OpenMaison" template), canonical, breadcrumb, FAQPage data, their own link-preview cards; each page leads with its tool's start, then the room types, how it works, key features, the questions, *Try it free*. 2.0's names and no promise the trial doesn't keep (every changed sentence below) | `lib/visualizer/trial/content.ts`, `components/visualizer/trial/trial-marketing.tsx`, `lib/site/{card,seo}.ts` |
| (public) "In production it shows 'not found' unless a flag is set. 1.0 is still waiting for bot protection (Turnstile) and a lasting rate-limit store." | **built (the switch) · stand-in (the two services)** — `TRIAL_VISUALIZER_ENABLED` (1.0's): `false` → every trial address is the site's **real 404** (probe: 9 / 9 on a server started with it off); unset → this prototype's demo shows it (`TRIAL_IN_DEMO = true`; a real build sets it false). Turnstile and the lasting store: **seams for the developers**, both in S34's registry with slots (`trial-bot-check` · `setBotCheck`; `trial-limit-store` · `setLimitStore`), `services.md` regenerated, `.env.example` | `lib/visualizer/trial/{policy,server}.ts`, `app/site/try/layout.tsx`, `lib/services/{registry,slots}.ts`, `services.md` |
| (onboarding) "A public, no-account try of the visualizer with a one-render limit and a watermark" | **built — with 1.0's code's limit, three**: the one-render figure was 1.0's older `/try` restyle demo (`FREE_UPLOADS = 1`, after three pre-rendered samples, linked from nowhere and superseded by `/try-visualizer` in 1.0 itself — its spec says so); 1.0's live trial and its tests say 3 (`trial-quota.test.ts` "exports a limit of 3"). The old address lands on this trial. Watermark and per-address limit as above | as above, `lib/site/model.ts` `OLD_SITE_ADDRESSES` |
| *(the step)* "on the website (S35's `/site` — `/try` was left for you; the site's links point to it)" | **built** — `/site/try`; the AI Visualizer's site page says **Try now** at its top and close (1.0's, while the trial is open); 1.0's `/try`, `/try-visualizer`, `/try-visualizer/<tool>` redirect; the sitemap lists the seven pages | `components/site/platform-pages.tsx`, `lib/site/{model,seo}.ts` |
| *(the step)* "upload a room photo (HEIC via `lib/heic.ts`, S20) or pick a sample room" | **built** — a HEIC opens on every browser (probe: an iPhone HEIC fixture); three sample rooms + the kitchen sketch | `picture-reader.ts`, `trial-open.ts` |
| *(the step)* "counted in a signed cookie + a per-IP limit (`lib/auth/limit.ts`, S35 made `takeTry` take a `max`)" | **built** — `takeTry(key, now, 10)` behind the limit-store seam, one bucket for asks and one for keeps (1.0 counted each request of its render routes) | `lib/visualizer/trial/server.ts` |
| *(the step)* "the end of the trial sends them to Start your studio (S31 `/sign-up` — carry the picture into the new studio if it fits honestly) or Book a demo (S35)" | **built** — the gate, the soft ask and the ⋯; **the visitor's own photo comes along** (only theirs, only on that press, only in that tab), sign-up says so and keeps it across its fresh start, the new studio opens on its AI Visualizer with the photo as the first room of a design named after it (probe §11, a studio made and taken away). Book a demo opens the site's own form over the editor | `lib/visualizer/trial/carry.ts`, `components/auth/studio-sign-up.tsx`, `lib/studios/model.ts`, `components/visualizer/home/visualizer-home.tsx` |
| *(the step)* "Every trial address goes in `PUBLIC_PATHS`" | **built** — `/site/try` is under `/site` (S35); 1.0's `/try` and `/try-visualizer` added | `lib/auth/paths.ts` |
| *(the step)* "Nothing a visitor makes is a studio's record; a trial's photos are kept only as long as 1.0 kept them (read it) and never reach a studio's Files" | **built** — 1.0 kept nothing ("your photo is only used for this session and never stored"; its spec: "ephemeral only, nothing persisted server-side beyond the signed quota cookie"). Here the photo never leaves the browser at all (the engine renders there; the server sees a count); every table is as it was after a visitor's whole trial (probe §3–§10); the carried photo goes only into the visitor's own new studio's AI Visualizer, never Files | — |
| *(S19's note)* "a trial spends no studio's credits" | **built** — no charge anywhere (no credits host on the site); the drift guard runs free | `trial-editor.tsx` |
| *(S35's note)* "any new cookie: the Cookie Policy's table" | **built** — `om_trial` (and the carried photo in the `om.*` row); S35's probe reads the code and stays green | `components/site/legal.tsx` |

### Found in 1.0, not on a card
- **1.0's older `/try` demo** (`(marketing)/try` + `landing/visualizer-demo.tsx` + `/api/demo/restyle`: three free pre-rendered sample restyles kept
  in localStorage, one own-photo restyle, a "Made with OpenMaison" text mark) — superseded in 1.0 by `/try-visualizer` (its spec: "supersedes
  that scope decision, explicitly"); **not ported as a second trial** — its address opens this one. In this trial a sample's restyle is a
  render like any other (1.0's `/try-visualizer` counted them the same).
- **1.0's "Detect again"** (re-run the model's surface detection) — the engine's reading is deterministic, and the studio's editor has no such
  press either; Draw a surface / Add by name do the job. **1.0's per-surface lock** ("Protect this surface") — not in 2.0's editor (the studio's
  own set is the trial's); not added for the trial alone (one system).
- **1.0's `track()` analytics events** (pending in its spec) — 2.0 has no analytics; the Cookie Policy says "may"; for the developers.
- **1.0's full-screen Before / after dialog** (the phone landed on it after a render) — 2.0's stage Compare and the ready line's *Compare* do
  the job, in the editor's own frame.

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
1. **Build it** (the public card's question: "should the website's trial return, built on 2.0's Visualizer and its sample rooms?") — yes, on
   2.0's Visualizer, its sample rooms and its welcome's before / after.
2. **Three renders, not one** — 1.0's code and tests (`TRIAL_LIMIT = 3`); the "one" was the superseded `/try` demo. Counted only when kept.
3. **The studio's own editor, not a copy** — its room logic moved into `room-session.ts` / `picture-reader.ts` and both run it (1.0 also built
   its trial "from the same presentational components" with its own state owner — here even the logic is shared).
4. **The stamp in the browser**, where the engine draws — 1.0's geometry; never an unmarked picture on failure. With a model the stamp moves
   to the server with the render (the registry says how).
5. **The tool cards open their pages** (1.0 opened an upload dialog): the page is that tool's start — one home, the same presses, and the
   search pages get their links.
6. **On in this prototype's demo** (`TRIAL_IN_DEMO = true`, the prompt's "ON so it can be shown"), off in a real build unless
   `TRIAL_VISUALIZER_ENABLED=true` — 1.0's rule. Set it for the build and the server alike (the sitemap and Try now are built).
7. **Bot protection and a lasting rate-limit store: seams with slots** (the providers' own env names — 1.0 had none for them).
8. **The photo carries, the renders don't** — the photo is the visitor's, the renders are watermarked trial pictures; the new studio renders
   without the mark from its own 150 welcome credits.
9. **Fast, one version** (1.0's trial model and `variants: 1`); the options line becomes the allowance.

## Every changed sentence (1.0 → the trial)

**Names, everywhere:** AI visualiser → AI Visualizer · "Sign up free" → **Start your studio** (S31's door) · titles "… — OpenMaison" → the
site's "… | OpenMaison" · "Try Now" → "Try now".

| Where | 1.0 said | The trial says | Why |
| --- | --- | --- | --- |
| Start · eyebrow | Free · no sign-up · {remaining} of {limit} renders left | Free · no sign-up · {n} of 3 free renders left | the allowance in one wording everywhere |
| Start · title | See your room, redesigned, in fifteen seconds. | See your room, redesigned, in seconds. | the engine takes a few seconds |
| Start · line | The same AI visualiser our design studios use, open to try. … generate. Real renders, not filters. | The same AI Visualizer our design studios use, open to try. … generate. | the name; "Real renders, not filters" cut — the prototype's engine repaints the photo |
| Start · fine print | JPG, PNG or HEIC · your photo is only used for this session and never stored. | JPG, PNG, WebP or HEIC · your photo stays in your browser — it is never uploaded or stored. | true of 2.0: the engine runs in the browser |
| Lighting · line, SEO, description | Morning light to cozy evening | Daylight to cozy evening | 2.0's presets have no Morning |
| Furniture · line | Remove, replace, or restyle individual pieces — sofa, bed, cabinets, anything. | Remove or recolour individual pieces — sofa, bed, cabinets, anything. | Replace draws no new piece in the prototype (Q-21 as she answered, S20); 1.0's own button word, Recolour |
| Furniture · SEO | Furniture AI — Swap Furniture in Any Room / Upload a room photo and remove, replace, or restyle individual pieces — … | Furniture AI — Change Furniture in Any Room / Remove or recolour individual pieces of furniture — … | the same |
| Furniture · headline | Swap furniture in any room in seconds | Change the furniture in any room in seconds | the same |
| Furniture · description | Upload a room photo, tap a piece of furniture, and remove it, replace it, or restyle it — … | Tap a piece of furniture and remove it or recolour it — … | the same; an upload has no furniture read (you mark it) |
| Furniture · steps | Upload a room photo — Furniture is detected automatically. · Remove, replace, or restyle — Describe the new look, or upload a reference photo. | Start with a room — A sample room's furniture is marked for you; on your own photo, mark a piece with a tap. · Remove or recolour — Pick a colour and a finish, or describe the new look. | what the trial does *(invented copy)* |
| Furniture · features / FAQ | Per-Item Control — Remove, replace, or restyle each piece … · Reference Images — Upload a photo of the exact piece … · Removing, replacing, or restyling a furniture group … | Remove or recolour each piece … · *(Reference Images cut)* · Removing or recolouring a furniture group … | Replace |
| Defurnish · SEO, description | Upload a room photo and clear it to a blank canvas — … | Clear a room to a blank canvas — … | emptying needs a sample room here |
| Defurnish · step 1 | Upload a room photo — Any furnished room. | Open a sample room — Each one is a furnished room. | the same *(invented copy)* |
| Sketch · line, SEO | Upload a hand sketch or floor plan — render it into a lifelike photo, styled the way you like. | Render a hand sketch into a lifelike photo, styled the way you like. | the sample sketch only here |
| Sketch · headline | Turn any sketch into a photo in seconds | Turn a sketch into a photo in seconds | the same |
| Sketch · description | Upload a hand sketch, CAD drawing, or a snapshot of a 3D model, and render it into a lifelike photo — … | Render a hand sketch into a lifelike photo — … | the same |
| Sketch · step 1 | Upload a sketch or floor plan — Hand-drawn, CAD, or a 3D model snapshot. | Open the sample sketch — A hand-drawn kitchen, ready to render. | 1.0's own sample words |
| Sketch · features / FAQ | Any Sketch or Floor Plan · Automatic Detection · Does it work with rough hand sketches? | *(cut)* | the same |
| Every page · "Generate" step | … in about 15 seconds | … in a few seconds | the engine's time |
| Shared feature | About 15 Seconds — Most renders finish in around 15 seconds. | A Few Seconds — Most renders finish in a few seconds. | the same |
| Shared feature / FAQ | … Sign up free afterward to keep going. / … to unlock every tool and keep going. | … Start your studio free afterward to keep going. / … to unlock every tool and keep going. | S31's door |
| Shared FAQ | … JPG or PNG. | … JPG, PNG, WebP or HEIC. | HEIC on every browser (S20) |
| Style · feature | 10 Design Styles — Modern, Scandinavian, Industrial, Japandi, Classic, Minimalist, Art Deco, Bohemian, Coastal, Farmhouse. | 25 Design Styles — Modern, … Farmhouse and 15 more. | 2.0 has all 25 of 1.0's styles |
| Style · FAQ | … or sign up for unlimited tries. | … or start your studio to keep going. | Free is not unlimited |
| Lighting · step / feature | Morning, golden hour, bright daylight, cozy evening, or overcast. · 5 Lighting Presets — … | Daylight, golden hour, warm cozy home, blue hour, overcast or directional spotlight. · 6 Lighting Presets — Daylight, Golden Hour, Warm Cozy Home, Blue Hour, Overcast, Directional Spotlight. | 2.0's six presets, read from the presets |
| Soft ask | That's one of your {remaining + 1} free renders. Sign up free to keep this design, download it without the watermark, and render as much as you like. | That's one of your 3 free renders. Start your studio free to keep working on this room, download without the watermark, and keep rendering. (+ Your room photo comes with you.) | the photo carries, not the renders; Free has 150 credits, not unlimited; 1.0's count read "2" after the second render |
| Gate | Sign up free to keep rendering, save your designs, and unlock the full editing suite. [Sign up free] | Start your studio free to keep rendering, save your designs, and unlock the full editing suite. [Start your studio] [Book a demo] | S31 · S35 |
| Compare dialog's foot | Free renders carry a small watermark. Sign up free to save this design in full resolution and keep editing without limits. | (on Download) Downloaded — free renders carry a small watermark | "full resolution" and "without limits" aren't true of 2.0 |
| Not a sketch | This doesn't look like a sketch — It reads as a photo, so there's nothing to render from a drawing. … | Render from sketch works on the sample sketch here — your picture opens as a photo: pick finishes, a style or a light. [Open the sample sketch] | 2.0 reads every upload as a photo |
| Progress | Reading the room · Applying your changes · Rendering light and shadow · … · Usually about 15 seconds | the editor's own steps (`PASS_STEPS`) | one system |
| Kept word for word | the quota line "… free renders left · no sign-up needed", "No free renders left", "You're going a little fast — give it a moment and try again.", "This trial isn't available right now — please check back later.", Leave this room? / Your renders aren't saved in the free trial. Download the ones you want to keep first. / Stay · Leave, "Works on any room, including", the room types, "How it works", "Key features", "Frequently asked questions", "Try it free", every other step, feature and question | | |

## Found and fixed on the way
- **A dynamic page's own `notFound()` under its streamed ghost answered 200** (S35's lesson, again): the trial's switch and the unknown tool are
  said by layouts above the ghosts (`app/site/try/layout.tsx`, `[tool]/layout.tsx`) — a real 404.
- **The first ghost never showed on a slow hop into the trial**: a client-drawn ghost waits for its own script (which carried the engine's
  data). The ghosts are server-drawn now, and **the editor and the engine load only when wanted** (or when the start is idle) — the page
  went from carrying the whole editor to its start alone.
- **The before / afters drew empty or letterboxed**: the house slider takes its box's shape — the boxes now have the photos' 3:2.
- **A V2 would have stamped V1's mark again** — the engine works from the unstamped picture; only what is shown and saved wears the mark.
- **S31's fresh start cleared every `om.*` key of the tab** — the carried photo is taken before and put back after, so it reaches the studio.

## What to check in the browser (signed out — sign out first; the demo's standing session sends /sign-up home)
- **1440** `/site/try`: the eyebrow's "3 of 3 free renders left", the before / after (drag it), *Open this sample*, the six cards (drag each,
  press one → its page). `/site/platform/visualizer` → **Try now**.
- Open the **Living room** → the editor over the screen (the site behind can't be tabbed into): a square on a wall → a finish → **Generate**
  → "V1 is ready · 2 of 3 free renders left"; the mark bottom right; **Download** (the file has it); the soft ask; Lighting → a preset
  (the live preview wears the mark too) → Relight; Style → Japandi → Restyle → **the gate**; *Book a demo* opens the site's form over it;
  **Start over** → Leave this room? → Leave; reload → "No free renders left".
- `/site/try/defurnish` → a sample → Empty the room is ready; your own photo → the honest line. `/site/try/sketch` → the sample sketch →
  Render from sketch; your own picture → opens as a photo + *Open the sample sketch*.
- Upload an iPhone **HEIC** → it opens; surfaces "Marked roughly…"; Furniture → Add furniture.
- **The carry**: upload a photo → ⋯ › Start your studio → sign-up's line → finish it → the new studio's AI Visualizer opens on the photo.
  (Afterwards: the studio menu › Studios · demo only › Demo Studio, or Reset prototype to base.)
- **390 touch**: the camera model (the dock, the tray), a render, the gate on the go line, the ⋯; the start and a tool page with the site's
  bottom bar; no sideways scroll at 390 / 320.
- **The switch**: start a server with `TRIAL_VISUALIZER_ENABLED=false` → every trial address is the site's 404.

## Probes run (lane A, :3160, fresh scratch copies of `pbuild/base.db` migrated + repaired)
| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s36.cjs`** (this step) | **109 / 109** on the last build (Book a demo typed in over the editor added); **OFF=1** on a server started with `TRIAL_VISUALIZER_ENABLED=false`: **9 / 9**. Every table as found (the trial's sections write nothing; §11's studio removed and the server switched back) |
| regression runner (`design-source/verify/regression/run.cjs`, :3160): `viz-studio` · `viz-client` · `viz-sheets` · `rooms-menu` · `ghosts-same` · `ghosts-same-390` · `ghosts-strips` · `ghosts-film` | **37 / 37 · 30 / 30 · 14 / 14 · 10 / 10 · 66 / 66 · 66 / 66** · captures done · done (the editor's refactor changed nothing it checks) |
| `pending-modules/verify-pm2-s20.cjs` (HEIC, Replace, the drift guard) | **58 / 58** |
| `pending-modules/verify-pm2-s35.cjs` (the site: the sitemap's pages all open, the Cookie Policy names every cookie the code sets) | **138 / 138** |
| `pending-modules/verify-pm2-s30.cjs` · `verify-pm2-s31.cjs` (sign-in · sign-up, their ghosts) | **108 / 108** · **104 / 104** |
| `pending-modules/verify-pm2-s34.cjs` (the registry, the slots, the seams script, `services.md`) — with its secrets | **180 / 180** (one assertion updated: the ops report's slots ≥ 12 — *a deliberate change of this rule*, commented) |
| `npm run design:anatomy` | **87 pages, 270 table heads, 26 dialogs, 41 page menus — all 1,717 measures hold** |
| `tsc --noEmit` · `eslint app components lib proxy.ts` · `design:lint` · `next build` (`DATABASE_URL=file:<scratch>`, under the lock) | clean · 0 errors (16 warnings, all older) · nothing new breaks a house rule · exit 0 |

## Migration and repair
**No migration, no repair (R123 stays free in lane A).** The trial keeps no record: its only state is the visitor's own signed cookie (and,
by their choice, the photo in their tab for the studio they start).

## Shared pieces changed
- **`components/visualizer/editor/visualizer-editor.tsx`** — its room logic now comes from **`room-session.ts`** (new) and the picture reader
  from **`picture-reader.ts`** (new); `editor-model.ts` and `dialogs/add-room.tsx` re-export the moved helpers. Behaviour unchanged (the
  Visualizer's probes above).
- `components/visualizer/editor/use-editor-state.ts` — `{ persist?: boolean }` (default true). `rail.tsx` — `GenerateFooter allowance`.
  `dialogs/small-dialogs.tsx` — `SwatchDialog studioChoice` (default true).
- `components/visualizer/home/visualizer-home.tsx` — `?trial=1` takes a carried photo; `upload(files, name?)`.
- `components/auth/studio-sign-up.tsx` + `lib/studios/model.ts` (`SIGN_UP.carried`) — the carried line and the landing.
- `components/site/platform-pages.tsx` (Try now) · `components/site/legal.tsx` (two Cookie Policy lines) · `components/site/site-ghosts.module.css`
  (`.tile`) · `lib/site/{model,seo,card}.ts` (old addresses, sitemap, link cards).
- `lib/auth/paths.ts` — `/try`, `/try-visualizer` in `PUBLIC_PATHS`. **`lib/services/slots.ts`** — two slots (`bot-check` · `limit-store`; lane B
  may add slots too — merge the union and `SLOT_KEYS` by hand). `lib/services/registry.ts` — two entries + the image model's note.
  `design-source/verify/pending-modules/verify-pm2-s34.cjs` — the slot count. `.env.example`. `services.md` regenerated from the registry
  (its *Every seam* section, the format S34 wrote).
- New: `app/site/try/**`, `components/visualizer/trial/**`, `lib/visualizer/trial/**`, `public/site/try/{watermark.png,materials-after.jpg,
  furniture-after.jpg}`, `scripts/viz/trial-cards.mts` + `scripts/viz/trial-watermark.svg` (1.0's logo). Nothing in `components/om/*`, the shell
  or `app/globals.css`.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — no mock: 1.0's trial is the reference and 2.0's own editor its frame; every changed
   and invented line is above and in REG-S36.1…12.
2. **One system, no one-offs** — the trial IS the studio's editor (its components and, now, its room logic in `room-session.ts`); the start
   is the site's own type, buttons and slider (`CompareSlider`); the house `ConfirmDialog`, `PortalMenu` + `DropdownItem`, snackbar,
   `MetaChip`, the ghost kit; tokens only (`design:lint` holds); one picture reader for every picker.
3. **Plain words** — 1.0's words where true ("3 of 3 free renders left", "Leave this room?"); no "quota", "HMAC", "model" or "rate limit" on
   screen; "You're going a little fast".
4. **Nothing is lost** — a failed or stopped render takes no render; Start over with renders asks first, a reload or a closed tab gets the
   browser's question; Undo on every pick, a removed version and a removed swatch; the visitor's photo goes with them to the studio they start.
5. **Say why** — the gate says what happened and the ways on; the sample-only tools say what this preview can do, in place; the server's
   refusals say why (too fast, off); an unreadable photo says why.
6. **Back returns where you came from** — Start over returns to the start (focus back on the upload button); a tool page's crumb to the
   trial's start, the trial's to the Visualizer's page; Book a demo closes back to the editor.
7. **Every screen is whole** — each trial page has its ghost (server-drawn, the title where the page's lands — 1440 · 390 touch), the editor
   its first-visit tip, the empty and refused states their words, a real 404 for an unknown tool or a closed trial.
8. **Every width is designed** — 1440 · 768 (touch and mouse) · 390 touch · 320 without sideways scroll on the start, a tool page and the
   editor; ≤1024 portrait the camera model (the dock, the tray, the gate on the go line); a landscape tablet the rail.
9. **Tables follow the leads listing** — not applicable (no table).
10. **Motion with purpose** — the editor's own (the tray's rise and fold, the progress card); the site's reveal untouched; reduced motion
    honoured (the editor's rules, the closing scroll).
11. **Honest data** — every number is the server's (the count) or the engine's (the pictures); no record written (every table checked); the
    stand-ins said where they are met; the tool cards' afters are each tool's own, made by the engine; no claim the trial can't keep.
12. **Reach for everyone** — the editor's keyboard (⌘Z, ← →, Esc, the tabs' arrows), focus moved into the editor as it opens and back on
    leaving, the site behind inert, labelled buttons and regions, the questions as the browser's own disclosure, alt text on the sample tiles
    left empty where the name is beside them.
- **How to add a missing thing:** one home (the site's `/site/try` — the website's own page for the website's visitor; the editor is the
  studio's, not a second one); doors (Try now, 1.0's addresses, the sitemap); shown only when it applies (the soft ask after the first render,
  the gate after the third, the sample-only lines only where only a sample can, Take a photo only without hover); **one filled button** per
  row (Generate; at the gate Start your studio); defaults that need no set-up (on in the demo, off in a real build until switched on — 1.0's).

## Flags for Vicky
- **No mock** — 1.0's trial on 2.0's editor; the start on the site's art direction.
- **On in this prototype's demo** (`TRIAL_IN_DEMO`); a real build is off until `TRIAL_VISUALIZER_ENABLED=true` (1.0 waited for Turnstile and a
  lasting store before switching it on — both are the developers' seams).
- **The tool cards open their own pages** (1.0 opened an upload dialog).
- **The visitor's photo is carried into a new studio** (only theirs, only on Start your studio) — 1.0 carried nothing.
- **A sample's restyle counts as a render** (1.0's live trial; its older `/try` gave three sample restyles free).
- **In the demo, Start your studio lands on the Dashboard** while the browser is the demo's standing session (S31's rule: someone signed in
  already has a studio) — sign out first to show sign-up.

## For the next steps
- **S41b:** 1.0's older `/try` demo and its `/api/demo/restyle` are recorded above as superseded (its address redirects); 1.0's `track()`
  analytics for the trial are the developers'.
- **S42:** the Sketch page's ghost draws three sample tiles where the page shows one (a loader can't know its tool).
- **The developers:** plug Turnstile (`setBotCheck`, mount the widget in `#trial-bot-check`, pass its token to `askTrialRender`) and a lasting
  store (`setLimitStore`), then set `TRIAL_VISUALIZER_ENABLED=true` for the build and the server; with an image model, render between
  `askTrialRender` and `keepTrialRender` on the server and stamp there (`markBox` is 1.0's geometry).
- **Lane B / the merge:** `lib/services/slots.ts` gained two keys; S34's probe now asserts ≥ 12 slots.
