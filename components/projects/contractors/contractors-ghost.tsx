import type { CSSProperties } from 'react'
import { Bone } from '@/components/shell/skeleton'
import { GhostChips, GhostTable, GhostTextButton, Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import { StatTiles } from '@/components/om/stat-tile'
import tile from '@/components/om/stat-tile.module.css'
import wl from '@/components/projects/workload/workload.module.css'

const TILES = [['Free this week', 'Nothing booked this week'], ['Free within 7 days', 'Their sites end this week'], ['Over capacity', 'More sites than they run at once'], ['No contractor yet', 'Work starting with nobody on it']] as const

/**
 * (REG-708, S45B · H-UHD-2) The Workload view's Contractors as its ghost — its own layout on its own classes: the Members · Contractors chips
 * for whoever has both, the caption with By contractor · By site and Vendors, the four tiles in their own words, then the contractors' rows
 * (the Members view's row: the round mark over the name and the trades, the bar of slots, the state over its line) or the By site table.
 * Drawn by the listing's ghost when the address (or this browser's last choice) says Contractors.
 */
export function ContractorsGhost({ chips, bySite }: { chips: boolean; bySite: boolean }) {
  return (
    <>
      {chips ? <GhostChips labels={['Members', 'Contractors']} /> : null}
      <div className={wl.view} aria-hidden>
        <div className={wl.caption}>
          <Line w={300} lh={20} h={10} />
          <span className={wl.captionActions}><Slot kind="pill" w={176} /><GhostChips labels={['By contractor', 'By site']} /><GhostTextButton label="Vendors" icon /></span>
        </div>
        <StatTiles>
          {TILES.map(([label, help]) => (
            <div key={label} className={tile.tile} data-wrap=""><Words className={tile.label}>{label}</Words><Line w={14} lh={24} h={20} /><Words className={tile.help}>{help}</Words></div>
          ))}
        </StatTiles>
        {bySite ? (
          <GhostTable head={56} row={64} rows={4} phone={{ card: 3 }} cols={[
            { basis: 240, grow: 1, head: 52, cell: (r) => [[176, 152, 196, 164][r % 4]!, 72] },
            { basis: 180, head: 84, cell: 112 },
            { basis: 170, head: 64, cell: { slot: 'chip', w: 96 } },
            { basis: 170, head: 64, cell: { slot: 'chip', w: 104 } },
            { basis: 170, head: 64, cell: 24 },
          ]} />
        ) : (
          <div className={wl.card}>
            {[1, 2, 2, 1, 0].map((n, i) => (
              <div key={i} className={wl.row}>
                <span className={wl.who}><Bone w={36} h={36} r="50%" /><span className={wl.whoText}><Line w={cycle([128, 104, 140], i)} lh={20} h={12} /><Line w={96} lh={16} h={10} /></span></span>
                <span className={wl.bar} style={{ '--slots': 2 } as CSSProperties}>
                  {Array.from({ length: 2 }, (_, k) => (k < n ? <Bone key={k} w="100%" h={36} r="var(--om-radius-1)" /> : <span key={k} className={wl.slot} />))}
                </span>
                <span className={wl.state}><Slot kind="chip" w={104} /><Line w={112} lh={16} h={10} /></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
