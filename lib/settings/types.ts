/**
 * Stage movement — studio-level policy set under Settings › Leads (user brief 2026-08-29).
 *   linear   one stage at a time: changing stage opens the Move stage window for the next stage only;
 *            completed stages stay editable, later stages are locked until the current one is done.
 *   flexible leads move instantly to any stage (Undo in the snackbar); details are optional and can be
 *            recorded later from the lead's journey. Won still opens its step — it creates the project.
 * On Hold / Lost keep their compact dialogs in both modes.
 */
export const STAGE_MOVEMENTS = ['linear', 'flexible'] as const
export type StageMovement = (typeof STAGE_MOVEMENTS)[number]
export const DEFAULT_STAGE_MOVEMENT: StageMovement = 'linear'

export const STAGE_MOVEMENT_OPTIONS: { key: StageMovement; title: string; help: string }[] = [
  { key: 'linear', title: 'Linear', help: 'Stages are completed one at a time. Changing a lead’s stage opens the Move stage window and asks for that stage’s details before it moves on.' },
  { key: 'flexible', title: 'Flexible', help: 'Leads move instantly to any stage, with no details asked up front. Stage details can be added later from the lead’s journey.' },
]

export function parseStageMovement(v: unknown): StageMovement {
  return v === 'flexible' ? 'flexible' : 'linear'
}
