# Brief — what is still pending from 1.0 (module level, read-only)

**Goal.** The owner (Vicky, product designer) has brought most of OpenMaison 1.0 into 2.0, module by module (Leads, quotes, contracts, X-Ray,
settings, price book, AI Visualizer, AI credits, Projects + Finance + the client portal, the 3-D planner, compliance, tickets, chat). She now asks:
"check the pending modules from 1.0 to 2.0 … go through all the modules in 1.0 … report it to me first on all the pending modules". You survey
ONE group of 1.0 (your prompt names it) and report every module or feature set in it that 2.0 does not have yet, or has only in part. Your report
becomes cards on a page she decides from (Build / Later / Skip), so be exact, short and plain.

**Read only. Never edit, create or delete a file in either repo.** Write only your output file (path in your prompt).

## The two codebases
- **1.0** = `/Users/vicky/Documents/GitHub/qanvast-id-tool` (Next.js; `src/app/**`, `src/components/**`, `src/lib/**`, `src/app/api/**`,
  `supabase/migrations/**`, `messages/**` (translations), `docs/**`). Read the code; docs only to explain intent.
- **2.0** = `/Users/vicky/Documents/GitHub/openmaison-prototype`. Start from `CLAUDE.md` › *Map* (what exists), `design-source/REGISTER.md`
  (decisions — grep it), and the parity audits `design-source/context/parity/*.md` (every module already audited: what was built, held or
  dropped and why). Confirm in 2.0's code before you say something is or isn't there.
- **Her standing decisions (don't re-litigate, but list what they hold back):** the Dashboard is held ("we will build it later"); Meetings / the
  meeting co-pilot wait for mocks (REG-552); regions beyond Singapore are not built (DEF-30); the roles editor, the daily digest and "who hears each
  notice" are held (Leads Q-40 · Q-42 · Q-43); authentication, infrastructure and real integrations are the developers' lane (AGENTS.md).

## What to report
For each **module** (a screen family or a capability a person would name: "the Marketplace", "Sign-up and onboarding", "Platform admin ›
Billing"), one entry. Split a big area into the modules a person would recognise; merge tiny pieces into their module. Skip what 2.0 already has
in full (say so in one line in `already_in_2`). For each entry, read enough code to say what it really does — a page that renders demo data or is
never linked is a sandbox: say so.

## Output — a JSON file, exactly this shape
```json
{
  "group": "<your group name>",
  "modules": [
    {
      "key": "<kebab-case id>",
      "name": "<what a person calls it, ≤ 40 chars>",
      "what": "<what it does in 1.0, 2–3 plain sentences>",
      "who": "studio | client | public | platform (OpenMaison staff) | system",
      "where_in_1": "<routes / menu path>",
      "v1_code": "<the main 1.0 folders/files>",
      "size": { "pages": 0, "components": 0, "api_routes": 0, "tables": 0, "loc": 0 },
      "real_or_sandbox": "real | partly built in 1.0 | sandbox / dev tool | dead code",
      "status_in_2": "none | partial | built",
      "in_2": "<where 2.0 has any of it, or ''>",
      "pending": ["<feature 1.0 has that 2.0 lacks, one line each>"],
      "depends_on": "<real services, data, mocks or decisions it needs — e.g. 'a payment gateway', 'an LLM', 'video recording', 'her mocks', ''>",
      "held_by": "<her decision that holds it, if any (Dashboard, REG-552, DEF-30, Q-40…), else ''>",
      "recommendation": "build | build with a stand-in | developers' lane | needs her mocks / decision | skip",
      "why": "<one or two sentences — the UX / product reason>",
      "effort": "S | M | L | XL",
      "questions": ["<what only she can decide, if anything>"]
    }
  ],
  "already_in_2": ["<1.0 module → where it is in 2.0, one line each>"],
  "notes": "<≤ 5 sentences: what you could not verify, dead code skipped>"
}
```
Effort, roughly: S = a day of one package · M = a package · L = two or three packages · XL = a programme of its own.
Plain English; name 2.0 places by what the screen says. Valid JSON (check with `node -e "JSON.parse(require('fs').readFileSync(process.argv[1]))" <file>`).
Final message: the output path and one line per module (name · status · recommendation · effort).
