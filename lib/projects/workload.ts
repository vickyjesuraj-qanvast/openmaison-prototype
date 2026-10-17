/**
 * (gaps build I, I-Q1…I-Q5 — 1.0's A-145…A-174) The Projects listing's Workload view: each person's running projects against the capacity the
 * studio sets for them. Pure and client-safe — the view reads the rows the list shows (its scope, Filters and search), so the two never disagree
 * (1.0 always counted the full list, A-170).
 *
 * - **Who is listed** (I-Q4): active Designers and Managers, and anyone else on a running project's team; for a Manager, themselves and the
 *   Designers who report to them. Projects with no one on the team get their own row — 1.0 dropped them (A-171).
 * - **What counts** (I-Q2): the shown rows that are not completed; an on-hold project still counts (it comes back to the same person).
 * - **Plain states** (I-Q5): "Room for 2 more" · "Full" · "1 over" — from the count against the capacity, never a percentage (A-172).
 */
export const CAPACITY_KEY = 'project_capacity_default'
export const DEFAULT_CAPACITY = 4   // 1.0's number (A-164), now the studio's to change
export const CAPACITY_MIN = 1
export const CAPACITY_MAX = 20
export const clampCapacity = (n: unknown): number | null => {
  const v = typeof n === 'number' ? n : typeof n === 'string' && n.trim() ? Number(n) : NaN
  return Number.isFinite(v) ? Math.max(CAPACITY_MIN, Math.min(CAPACITY_MAX, Math.round(v))) : null
}
export const parseDefaultCapacity = (v: unknown): number => {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  return clampCapacity(raw) ?? DEFAULT_CAPACITY
}

export type WorkloadPerson = { id: string; name: string; role: string; color: string; isActive?: boolean | null; managerId?: string | null; projectCapacity?: number | null }
/** The listing row's facts the view reads. */
export type WorkloadProject = { id: string; name: string; number: string; stage: string; team: { id: string }[]; attention: string[]; hold?: { since: number } | null }
export type WorkloadState = 'room' | 'full' | 'over'
export type WorkloadLine<P extends WorkloadProject> = {
  /** null = the No one yet row */
  person: WorkloadPerson | null
  projects: P[]
  count: number
  capacity: number
  /** Whether the capacity is the person's own (else the studio's default). */
  own: boolean
  state: WorkloadState
  words: string
}

export const stateOf = (count: number, capacity: number): WorkloadState => (count < capacity ? 'room' : count === capacity ? 'full' : 'over')
export const stateWords = (count: number, capacity: number): string => {
  const s = stateOf(count, capacity)
  return s === 'room' ? `Room for ${capacity - count} more` : s === 'full' ? 'Full' : `${count - capacity} over`
}
export const capacityOf = (p: Pick<WorkloadPerson, 'projectCapacity'>, studioDefault: number) => clampCapacity(p.projectCapacity) ?? studioDefault

/** Who may see the view: Owners, Admins and Managers (I-Q1). Who sets capacities: Owners and Admins (I-Q3). */
export const seesWorkload = (role: string | null | undefined) => role === 'Owner' || role === 'Admin' || role === 'Manager'
export const setsCapacity = (role: string | null | undefined) => role === 'Owner' || role === 'Admin'

/** The view's lines: busiest first (by load against capacity, then by count), then by name; the No one yet row last. */
export function workloadOf<P extends WorkloadProject>(rows: P[], people: WorkloadPerson[], viewer: { id: string; role: string; teamIds: string[] }, studioDefault: number): { lines: WorkloadLine<P>[]; counted: number; completed: number } {
  const running = rows.filter((r) => r.stage !== 'completed')
  const onTeam = new Set(running.flatMap((r) => r.team.map((m) => m.id)))
  const live = people.filter((p) => p.isActive !== false)
  const listed = viewer.role === 'Manager'
    ? live.filter((p) => p.id === viewer.id || viewer.teamIds.includes(p.id))
    : live.filter((p) => p.role === 'Designer' || p.role === 'Manager' || onTeam.has(p.id))
  const lines: WorkloadLine<P>[] = listed.map((p) => {
    const mine = running.filter((r) => r.team.some((m) => m.id === p.id))
    const capacity = capacityOf(p, studioDefault)
    return { person: p, projects: mine, count: mine.length, capacity, own: clampCapacity(p.projectCapacity) !== null, state: stateOf(mine.length, capacity), words: stateWords(mine.length, capacity) }
  })
  lines.sort((a, b) => (b.count / b.capacity) - (a.count / a.capacity) || b.count - a.count || (a.person?.name ?? '').localeCompare(b.person?.name ?? ''))
  const nobody = viewer.role === 'Manager' ? [] : running.filter((r) => r.team.length === 0)
  if (nobody.length) lines.push({ person: null, projects: nobody, count: nobody.length, capacity: 0, own: false, state: 'over', words: `${nobody.length} with no one on the team` })
  return { lines, counted: running.length, completed: rows.length - running.length }
}

/** The people Set capacity lists: everyone the view lists over every project (not only the shown rows), in name order. */
export function workloadPeople(people: WorkloadPerson[], viewer: { id: string; role: string }, teamIds: string[], rows: WorkloadProject[]): WorkloadPerson[] {
  return workloadOf(rows, people, { ...viewer, teamIds }, 1).lines.flatMap((l) => (l.person ? [l.person] : [])).sort((a, b) => a.name.localeCompare(b.name))
}
