# Template editor ↔ quote editor — where the "New quotes" settings go (audit, 2026-09-23)

Owner's brief: "options like signature turned off and still it is showing in the quote editor even after turning it off … find all the bugs and issues and report it to me."

Nothing is fixed here. Every step below was walked on the production build (:3011, the test DB) with `audit-template-defaults.cjs`; the screenshots are in `design-source/verify/template-defaults-audit/`.

## 1. The short answer to what you saw

The template editor's **New quotes** tab writes the template's *draft*. Nothing reaches any quote until you press **Publish changes**, and even then only a **new** quote takes the settings (or a Draft quote whose template card asks "Apply defaults"). The quote you were looking at keeps its own switches. And the signature line you still saw printed comes from the **Page** tab's Signature block, not from "Client signature required" — that switch only decides whether the client is asked to sign online when you send.

Neither of those two facts is said anywhere on the screen. That is the root of it; the list below has the rest.

## 2. What the walk-through showed

| Step | What happened |
|---|---|
| Turn "Client signature required" and "GST on" off in 4-Room BTO › New quotes | Saved to the draft only (`draft_json`); the published settings unchanged; the top bar reads "Edited since v1 · Publish changes". The pane says "A new quote from this template starts with these. Each one can still be changed on the quote." — nothing about publishing or existing quotes. |
| Open OM-10008 (on that template) without publishing | Signature on, GST on — unchanged. |
| Publish (v2) from the editor opened from OM-10008 (Approved) | "Publish and update OM-10008" is not offered for an Approved quote. The quote stays on v1, its card reads "v1 · v2 published", the update banner offers "Update to v2". |
| Publish (v3, validity 14 → 21) from the editor opened from OM-10001 (Draft) with "Publish and update OM-10001" | The quote moves to v3; its validity, GST and signature do **not** change. The snackbar says "4-Room BTO v3 published — OM-10001 updated". |
| New quote from the template (Create Quote › Use 4-Room BTO) | Everything lands: signature off, GST off, valid 14 days, the six starter sections, the 10/30/30/30 split. **Works.** |
| Its Preview | Prints "Confirmed & Agreed By Owner: Name:" — a client signature line — with the client signature switched off. No GST line (correct). |
| OM-10001 (Draft) › Change template → 4-Room BTO → "Apply defaults" | Signature off, GST off, validity from today. **Works** (then the "Regroup?" question follows). |
| Blank Quote from the modal | Signature on, GST on, 30 days, no starter sections, no template — but prints through the studio's default template, whose own settings say six starter sections. |
| The template names a Terms text that was then deleted | The New quotes tab's "Terms and Conditions" field shows blank (not "None"); a new quote is still seeded with the deleted text. |
| Per-line GST on the no-GST quote | Every line and starter section carries GST 9 % while the quote's GST switch is off. |

## 3. Findings

| # | Finding | Verdict | Proposed fix | Size |
|---|---|---|---|---|
| 1 | Nothing says that New quotes settings reach **new** quotes only, and only **after Publish**. The pane's intro stops at "starts with these". | Copy gap — the cause of what you saw | Pane intro: "A new quote from this template starts with these — once you publish. Quotes you already have keep their own settings; a Draft's template card can Apply defaults." A one-line note under the top bar's "Edited since v1" chip while on this tab. | small |
| 2 | "Publish and update OM-…" (the editor opened from a Draft), the banner's "Update to vN" and the publish dialog's "Move open draft quotes to this version" move the pinned **version only**; the changed defaults never land, yet the snackbar says "OM-10001 updated". | Gap, misleading words | On a Draft: apply the defaults too, asked the way Change template asks ("Apply defaults · Keep mine"), or a switch in the publish dialog "Also give OM-10001 the new settings". The snackbar names what changed. | medium |
| 3 | Three switches say "signature" and mean three things: New quotes › *Client signature required* (ask the client to sign online on send); Page › *Signature* block (the printed lines, with a client column); Preview › What your client sees › *Signature block* (this quote's print override). The printed "Confirmed & Agreed By Owner" line ignores the first. | Confusing model — your second observation | Rename the workflow switch on the template **and** the quote's Signature section to "Ask the client to sign online". Your call: (a) the printed client column prints only when the client is asked to sign (online or on paper — a second option "Client signs on paper" keeps the line), or (b) keep the printed line as the template's design and say so under the switch: "The printed signature lines are the template's Page tab." | medium |
| 4 | **Blank Quote** (the modal's first tile) prints through the studio's default template but ignores that template's New quotes settings — GST, signature, validity, split, starter sections, working columns. Setting defaults on the default template does nothing for a Blank Quote. | Gap | Blank Quote = the default template's settings with an empty table (no starter sections), or rename the tile "Empty table — no template settings" and move it after the default template. | small |
| 5 | A Terms / Notes text deleted from the library keeps seeding new quotes and "Apply defaults" (`createQuote` reads it regardless of `deleted_at`); the New quotes select shows a blank value instead of "None". A deleted payment template falls back to 10/30/30/30 silently, with the same blank select. The delete has no guard (only Delete forever has one). | Bug | Deleting a text or payment template clears it from every template's New quotes (draft and published) with a snackbar naming them, or refuses while named (as Delete forever does); `createQuote` / `applyTemplateDefaults` ignore deleted ones; a missing id shows "None". | small |
| 6 | **Save as template** promises "this quote's payment split, validity, GST and signature settings as its defaults" but takes validity from the quote's current template, not the quote; the quote's sections are not offered as starter sections. | Bug (copy vs behaviour) | Validity = the quote's Valid Until minus its date; starter sections = the quote's top-level sections, as a switch in the dialog. | small |
| 7 | The update banner offers "Update to vN" on Approved, Sent and Signed quotes, and the server takes it, while the publish dialog promises "Sent quotes keep the version they were sent with". | Inconsistency | Only Drafts get the banner; the others show "v1 · v2 published" as information only; the server refuses past Draft. | small |
| 8 | On a quote with GST off, every new line (and the starter sections) is written with GST 9 %, so the GST (%) column reads 9 down the table beside an off switch. | Minor | New lines take 0 while GST is off; or the GST (%) column hides while it is off. | small |
| 9 | The quote's template card says "Valid 14 days · no GST" and drops the signature word entirely when it is off; the template picker does the same. | Minor copy | "· no client signature" when off. | tiny |
| 10 | The quote's Signature section switch reads "Client Signature Required" while its client box says "Requested when you send · signed on approval" / "Not requested — the client signs on paper". | Copy, part of #3 | The same words as #3 on both. | tiny |

## 4. What works, verified

A new quote from a published template takes every New quotes setting; Change template → Apply defaults on a Draft takes them too and asks first; an Approved quote is never moved by a publish; the New quotes tab autosaves and "Edited since vN" tells the state; the GST line drops from the print when GST is off.

## 5. Status (2026-09-23, the owner's "go ahead and fix everything" on the recommendations)

| # | Built as |
|---|---|
| 1 · 3 · 9 · 10 | REG-578 — the tab's words + "Not published yet"; *Client signs online* on the template, the quote and the picker; the printed line stays the template's design (the owner's answer) |
| 2 · 7 | REG-579 — the moved quote asks "Apply defaults · Keep mine" (`?apply=`, the banner); Drafts only, server guard; honest snackbars and dialog help |
| 4 | REG-580 — Blank Quote takes the default template's settings, empty table |
| 5 | REG-581 — deleted texts / splits never seed and leave every template's New quotes; selects read the fallback |
| 6 | REG-582 — Save as template carries validity + sections (a switch) |
| 8 | REG-583 — the GST (%) column rests while GST is off |

Probe `verify-template-defaults.cjs` (26 checks); screenshots `design-source/verify/template-defaults/`.

## 6. Decisions that were needed (answered by the recommendations)

1. #3: should the printed client signature line follow the switch (a), or stay the template's design with a note (b)?
2. #4: Blank Quote takes the default template's settings, or is renamed and moved?
3. #2: apply the defaults on "Publish and update" with a question, or with a switch in the publish dialog?
4. The rename in #3: "Ask the client to sign online"?
