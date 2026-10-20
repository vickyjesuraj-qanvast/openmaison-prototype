# Rules for AI coding assistants in this repo

Claude Code, Cursor, Codex, Copilot and any other assistant: read this before you change code here.

## Who you are working with

OpenMaison 2.0's design belongs to **Vicky** (he/him), the product designer and the repo's owner. Unless the person you are working with tells you they
are Vicky, assume they are a developer integrating OpenMaison 1.0 into this prototype. Everything below is for work with
a developer. When you work with Vicky, his own rules in `CLAUDE.md` › *How we work* apply instead.

## The rule: nothing a user can see changes without Vicky

Every screen, word, state and motion here was designed on purpose and logged in `design-source/REGISTER.md`.
Before you change anything in **Vicky's lane**, stop and tell the person that it needs Vicky's approval. His lane covers:

- **What renders:** pages, components, CSS modules, tokens, icons and loading ghosts.
- **What users read:** labels, messages, snackbars, errors, empty states, tooltips and formats.
- **How it behaves:** motion, focus, keyboard, what a press does, where a flow goes, who may do what and how a refusal
  reads.
- **Scope:** removing or hiding anything visible, and adding a screen.

Then offer one of these instead:

1. Draft the proposal for their pull request: what, why, and the screenshots to take at 1440 and 390. Vicky reviews it.
2. Keep the work out of the visible layer. For example, make the server change and leave the screen as it is.

Don't make a visible change because it is small, obvious, a cleanup, or "just a fix". If something looks wrong, search
the register for the `REG-nnn` named in the nearby code comment. If it is a decision, explain it; if it isn't, flag it
for Vicky. Don't fix it silently.

## What you can do normally

The data layer, server actions' internals, the port of 1.0's data, integrations, authentication, infrastructure, tests
and CI — following `CONTRIBUTING.md` §5. If such a change would reach the screen (a new error message, a new wait, a
changed rule), treat that part as visible.

## Always, with a developer

- Read `DESIGN-PRINCIPLES.md` and `CONTRIBUTING.md` first. Find the code through the *Map* in `CLAUDE.md`, and where each part
  of 1.0 went in `FROM-1.0-TO-2.0.md`.
- Don't edit `CLAUDE.md`, `DESIGN-PRINCIPLES.md`, `design-source/**` or `.github/CODEOWNERS`. They are Vicky's.
- Never write to `local.db` from a test or script. Put `DATABASE_URL=file:<scratch path>` on the same command.
- Migrations are additive only. A refused action answers `{ error: <the rule> }`. A long string (a picture, rich text)
  goes to a server action inside one object argument.
- Reuse `components/om/*`. Use `--om-*` tokens only, and design-system components through `@/components/ds`.
- Never copy a house piece's stylesheet or hand-roll a dialog head, close, foot, table head or menu row — every
  inconsistency found on 2026-09-29 was a copy that drifted. Use `Dialog` / `ConfirmDialog` / `Drawer`, or `SurfaceHead` +
  `SurfaceFoot` (`components/om/dialog.tsx`), the listing's table model, and `PortalMenu` + `DropdownItem`.
- Before a pull request, run `npm run design:lint`, and `npm run design:anatomy` against `next start` on a scratch
  database. Never raise `design-lint.baseline.json` to make a check pass — fix the code, or ask Vicky.
- Commit only when asked, never push to `main` directly, and open a pull request for review.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
