'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { PageReveal } from '@/components/shell/page-reveal'
import { ImportsSkeleton } from '@/components/shell/skeleton'
import { Tooltip } from '@/components/om/tooltip'
import { useSearchTarget } from '@/components/shell/search-focus'
import { MaisonFab } from '@/components/shell/maison-fab'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { ImportWizard, TEMPLATE_HREF, type ImportPayload, type ImportResult } from '@/components/leads/import-wizard'
import { displayDate } from '@/lib/format'
import type { ImportBatch } from '@/lib/db/schema'
import { importLeads } from '@/app/leads/actions'
import pageStyles from '@/app/leads/leads.module.css'
import toolbarStyles from '@/components/leads/toolbar.module.css'
import styles from './imports.module.css'

const COLS = [
  { key: 'date', label: 'Date', width: 141, sortable: true },
  { key: 'file', label: 'File Name', width: 285 },
  { key: 'total', label: 'Total Rows', width: 118 },
  { key: 'imported', label: 'Rows Imported', width: 142 },
  { key: 'errors', label: 'Error count', width: 396 },
  { key: 'log', label: 'Error Log', width: 234 },
] as const

function TemplateButton() {
  // The DS Button is the activation target and drives the download itself
  // (a react-aria button nested inside <a download> is not a reliable click path).
  return (
    <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />}
            onPress={() => { const a = document.createElement('a'); a.href = TEMPLATE_HREF; a.download = ''; a.click() }}>
      Download Template
    </Button>
  )
}

function View({ imports }: { imports: ImportBatch[] }) {
  const searchRef = useRef<HTMLInputElement>(null)
  useSearchTarget(searchRef)
  const router = useRouter()
  const comingSoon = useComingSoon()
  const snackbar = useSnackbar()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [query, setQuery] = useState('')
  // Rest state shows the neutral sort glyph (mock); clicking cycles desc → asc → rest.
  const [dateDir, setDateDir] = useState<'none' | 'desc' | 'asc'>('none')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? imports.filter((i) => i.fileName.toLowerCase().includes(q)) : imports
    if (dateDir === 'none') return list
    return [...list].sort((a, b) => (dateDir === 'desc' ? b.createdAt.getTime() - a.createdAt.getTime() : a.createdAt.getTime() - b.createdAt.getTime()))
  }, [imports, query, dateDir])

  const onImport = async (payload: ImportPayload): Promise<ImportResult | null> => {
    try { return await importLeads(payload) }
    catch { snackbar({ message: 'Couldn’t import the file — please try again' }); return null }
  }

  const uploadButton = (
    <Button iconStart={<Icon name="upload" size={20} />} onPress={() => setWizardOpen(true)}>Upload</Button>
  )

  return (
    <PageReveal skeleton={<ImportsSkeleton />}>
        <div className={pageStyles.body}>
          <header className={styles.header}>
            <Tooltip label="Back to Leads">
              <button type="button" className={styles.back} aria-label="Back to Leads" onClick={() => router.push('/leads')}>
                <Icon name="arrow_back" size={24} weight={300} />
              </button>
            </Tooltip>
            <div className={styles.titleBlock}>
              <span className={styles.crumb}>Leads / </span>
              <h1 className={styles.title}>Lead Import History</h1>
            </div>
            <div className={styles.actions}>
              <TemplateButton />
              {uploadButton}
            </div>
          </header>

          {imports.length === 0 ? (
            <div className={styles.empty}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/figma-assets/import-history-empty.svg" alt="" className={styles.emptyArt} />
              <div className={styles.emptyText}>
                <span className={styles.emptyTitle}>Your imported files will appear here</span>
                <div className={styles.emptyBody}>
                  <span>Once you import leads, this page will help you:</span>
                  <ul>
                    <li>Avoid duplicate leads with import history</li>
                    <li>Quickly access previous import details</li>
                    <li>Download error reports to fix and re-import</li>
                  </ul>
                </div>
              </div>
              <div className={styles.emptyBtns}>
                <TemplateButton />
                {uploadButton}
              </div>
            </div>
          ) : (
            <div className={styles.content}>
              <div className={styles.toolbar}>
                <span className={styles.sectionTitle}>All Import History</span>
                <div className={styles.toolRight}>
                  <label className={toolbarStyles.search}>
                    <Icon name="search" size={20} family="outlined" />
                    <input ref={searchRef} className={toolbarStyles.searchInput} placeholder="Search" value={query}
                           onChange={(e) => setQuery(e.target.value)} aria-label="Search imports" />
                    {query ? (
                      <button type="button" className={toolbarStyles.searchClear} aria-label="Clear search" onClick={() => setQuery('')}>
                        <Icon name="close" size={18} />
                      </button>
                    ) : null}
                  </label>
                  <Tooltip label="Filters"><IconButton icon="filter_list" label="Filter imports" onClick={comingSoon} /></Tooltip>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <div className={styles.table} role="table" aria-label="Import history">
                  <div className={styles.headRow} role="row">
                    {COLS.map((c) => (
                      <div key={c.key} className={styles.hCell} style={{ flex: `${c.width} 0 ${c.width}px` }} role="columnheader">
                        {'sortable' in c && c.sortable ? (
                          <button type="button" className={styles.hSort} data-sorted={dateDir !== 'none' || undefined}
                                  onClick={() => setDateDir((d) => (d === 'none' ? 'desc' : d === 'desc' ? 'asc' : 'none'))}>
                            {c.label}<Icon name={dateDir === 'none' ? 'unfold_more' : dateDir === 'desc' ? 'arrow_downward' : 'arrow_upward'} size={16} />
                          </button>
                        ) : c.label}
                      </div>
                    ))}
                  </div>
                  {rows.length === 0 ? (
                    <div className={styles.noMatch}>No imports match “{query}”.</div>
                  ) : rows.map((b) => (
                    <div key={b.id} className={styles.row} role="row">
                      <div className={styles.cell} style={{ flex: '141 0 141px' }}><span>{displayDate(b.createdAt)}</span></div>
                      <div className={`${styles.cell} ${styles.fileName}`} style={{ flex: '285 0 285px' }}><span>{b.fileName}</span></div>
                      <div className={styles.cell} style={{ flex: '118 0 118px' }}><span>{b.totalRows}</span></div>
                      <div className={styles.cell} style={{ flex: '142 0 142px' }}><span>{b.importedRows}</span></div>
                      <div className={styles.cell} style={{ flex: '396 0 396px' }}><span>{b.errorNote ?? 'No errors'}</span></div>
                      <div className={styles.cell} style={{ flex: '234 0 234px' }}>
                        {b.skippedRows > 0 ? (
                          <a className={styles.link} href={`/leads/imports/${b.id}/skipped`} download>Download Skipped Records</a>
                        ) : <span style={{ color: 'var(--om-color-on-surface-secondary)' }}>—</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      <MaisonFab onPress={comingSoon} />
      <ImportWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onImport={onImport}
                    onDone={(r) => {
                      setWizardOpen(false)
                      router.refresh()
                      snackbar(r.destination === 'listing' ? (r.approved === 0 && r.duplicates + r.flagged > 0 ? { message: `${r.duplicates + r.flagged} possible duplicate${r.duplicates + r.flagged === 1 ? '' : 's'} sent to review` } : { message: `${r.approved} lead${r.approved === 1 ? '' : 's'} added to your listing` }) : { message: `${r.imported} lead${r.imported === 1 ? '' : 's'} ready for review` })
                    }} />
    </PageReveal>
  )
}

export function ImportsView(props: { imports: ImportBatch[] }) {
  return <View {...props} />
}
