'use client'

import { useRef, type ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { SegmentedIconToggle } from '@/components/om/segmented'
import { Tooltip } from '@/components/om/tooltip'
import { useSearchTarget } from '@/components/shell/search-focus'
import styles from './toolbar.module.css'

export function LeadsToolbar({
  chipLabel,
  onChipClick,
  chipOpen = false,
  query,
  onQueryChange,
  onFilterClick,
  filterCount = 0,
  view,
  onViewChange,
  chipMenu,
}: {
  chipLabel: string
  onChipClick: () => void
  /** The pill's menu is open — chevron points up. */
  chipOpen?: boolean
  query: string
  onQueryChange: (q: string) => void
  onFilterClick: () => void
  /** A2: number of active filter groups — badge on the filter button. */
  filterCount?: number
  view: 'table' | 'kanban'
  onViewChange: (v: 'table' | 'kanban') => void
  /** Anchored menu rendered under the stage pill. */
  chipMenu?: ReactNode
}) {
  const searchRef = useRef<HTMLInputElement>(null)
  useSearchTarget(searchRef)
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <button type="button" className={styles.chip} onClick={onChipClick} aria-haspopup="menu" aria-expanded={chipOpen} data-open={chipOpen || undefined}>
          {chipLabel}
          <span className={styles.chipChevron}><Icon name="keyboard_arrow_down" size={20} /></span>
        </button>
        {chipMenu}
      </div>
      <div className={styles.right}>
        <label className={styles.search}>
          <Icon name="search" size={20} family="outlined" />
          <input
            ref={searchRef}
            className={styles.searchInput}
            placeholder="Search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search leads"
          />
          {query ? (
            <Tooltip label="Clear search">
              <button type="button" className={styles.searchClear} aria-label="Clear search" onClick={() => onQueryChange('')}>
                <Icon name="close" size={18} />
              </button>
            </Tooltip>
          ) : null}
        </label>
        <span className={styles.filterWrap}>
          <Tooltip label="Filters">
            <IconButton icon="filter_list" label={filterCount ? `Filters (${filterCount} active)` : 'Filters'} onClick={onFilterClick} selected={filterCount > 0} />
          </Tooltip>
          {filterCount > 0 ? <span className={styles.filterBadge} aria-hidden>{filterCount}</span> : null}
        </span>
        <SegmentedIconToggle
          label="View"
          value={view}
          onChange={(v) => onViewChange(v as 'table' | 'kanban')}
          options={[
            { value: 'table', icon: 'view_list', label: 'Table view' },
            { value: 'kanban', icon: 'view_kanban', label: 'Kanban view' },
          ]}
        />
      </div>
    </div>
  )
}
