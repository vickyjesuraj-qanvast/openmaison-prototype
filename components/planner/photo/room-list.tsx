'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem } from '@/components/leads/dropdown'
import { KIND_LABEL } from '@/lib/planner/model'
import { ROOM_PRESETS } from '@/lib/planner/templates'
import { PLACE_MAX, addedRoom, type PlaceRoom } from '@/lib/planner/photo'
import styles from './room-list.module.css'

/**
 * A floor plan's rooms, changed by hand: each row's × takes it off, *Add a room ▾* the planner's room presets, named on from the list
 * ("Bedroom 4", "Bathroom 2"). Make a 3D picture's Change the rooms (pending modules S28, REG-1930), shared since REG-2800 with Floorplan to 3D
 * Isometric's "Not quite right?" (1.0's correction of the rooms read off the plan).
 */
export function RoomList({ rooms, onRooms, label = 'Rooms to place', testId = 'photo-room' }: {
  rooms: PlaceRoom[]
  onRooms: (next: (list: PlaceRoom[]) => PlaceRoom[]) => void
  label?: string
  /** the list is `<testId>-list`, the add button `<testId>-add` */ testId?: string
}) {
  const [addMenu, setAddMenu] = useState(false)
  const addAnchor = useRef<HTMLSpanElement>(null)
  return (
    <>
      <ul className={styles.list} aria-label={label} data-testid={`${testId}-list`}>
        {rooms.map((r, i) => (
          <li key={`${r.name}-${i}`} className={styles.row}>
            <span className={styles.rowText}><span className={styles.rowName}>{r.name}</span>{KIND_LABEL[r.kind] !== r.name ? <span className={styles.rowSub}>{KIND_LABEL[r.kind]}</span> : null}</span>
            <IconButton icon="close" label={`Take ${r.name} off the list`} size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => onRooms((list) => list.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ul>
      {rooms.length < PLACE_MAX ? (
        <span ref={addAnchor} className={styles.addWrap}><Button variant="secondary" appearance="outlined" size="sm" iconStart={<Icon name="add" size={18} weight={300} />} iconEnd={<Icon name="arrow_drop_down" size={18} />} onPress={() => setAddMenu((v) => !v)} aria-haspopup="menu" aria-expanded={addMenu} data-testid={`${testId}-add`}>Add a room</Button></span>
      ) : null}
      <PortalMenu open={addMenu} anchor={addAnchor} onClose={() => setAddMenu(false)} role="menu" width={240} sheetTitle="Add a room">
        {ROOM_PRESETS.map((p) => <DropdownItem key={p.kind} onSelect={() => { setAddMenu(false); onRooms((list) => [...list, addedRoom(p.kind, list)]) }}>{p.name}</DropdownItem>)}
      </PortalMenu>
    </>
  )
}
