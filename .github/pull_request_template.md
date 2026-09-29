## What and why

<!-- What changes, and why. Link the 1.0 feature, the migration map section, or the REG-nnn this relates to. -->

## Does this change anything a user can see?

<!-- Read DESIGN-PRINCIPLES.md: nothing a user can see changes without Vicky. -->

- [ ] **No.** Data layer, server internals, integration, auth, infrastructure, tests or CI only, with no new message,
      state, wait or rule on screen.
- [ ] **Yes.** Layout, spacing, colour, type, icon, copy, motion, interaction, flow, an empty / loading / error state, a
      rule a user meets, or a new screen. **Vicky must approve this before it merges.** Add screenshots below.

## Screenshots (for anything visible)

| Width | Before | After |
| --- | --- | --- |
| 1440 | | |
| 390 | | |
| 768 (if the layout changes) | | |

## Checks

- [ ] `npm run typecheck`, `npm run lint`, `npm run design:lint` and `npm run build` pass, and `npm run design:anatomy`
      passes against the build (CI runs all of them).
- [ ] Nothing visible is hand-rolled or copied: dialogs, confirms, drawers, tables and menus use the house pieces in
      `components/om/*`, and `design-lint.baseline.json` is unchanged or lower — never raised.
- [ ] Migrations are additive only. A new kind of record has its Activity line and a repair rule.
- [ ] Tests and probes ran on a scratch database (`DATABASE_URL` on the command), never on `local.db`;
      `fixtures/baseline.json` is untouched or rebuilt with `npm run db:baseline`.
- [ ] The module's probes still pass (`design-source/verify/**/verify-*.cjs`), for anything visible.

## For the register (visible changes)

<!-- Propose the entry. Vicky adds it to design-source/REGISTER.md. -->
