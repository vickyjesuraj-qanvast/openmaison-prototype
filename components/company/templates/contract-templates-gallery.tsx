'use client'

import { useCallback, useEffect, useState } from 'react'
import { rememberContractPdf, useRememberContractPdfs } from '@/components/contracts/editor/contract-route-ghost'   // (S42 B-17)
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { PickLeadDialog } from '@/components/contracts/pick-lead-dialog'
import { ContractPaper } from '@/components/contracts/render/contract-paper'
import { excerptOf, outlineOf } from '@/lib/contracts/tokens'
import { templateKind } from '@/lib/company/sections'
import type { ContractTemplateRow, ContractTemplatesData } from '@/lib/contracts/queries'
import { contractFromTemplate, createContractTemplate, createPdfTemplate, deleteContractTemplate, deleteContractTemplatesForever, duplicateContractTemplate, emptyContractTemplateTrash, renameContractTemplate, restoreContractTemplates, setDefaultContractTemplate, setHandoverContractTemplate } from '@/app/company/contract-templates-actions'
import { UploadPdfDialog } from './upload-pdf-dialog'
import { fileSize } from '@/lib/format'
import { MetaChip } from '@/components/om/meta-chip'
import { Icon } from '@/components/om/icon'
import { fetchContractOptionsAction } from '@/app/contracts/read-actions'
import type { BrandKit, StudioDetails } from '@/lib/templates/model'
import type { TokenValues } from '@/lib/contracts/tokens'
import { LibraryGallery, newIdOf, reasonOf } from './library-gallery'
import { PickOneDialog, type PickOption } from './pick-one-dialog'
import styles from './library-gallery.module.css'
import own from './contract-templates-gallery.module.css'
import { templateChangeBlock, templateDefaultBlock, templatePurgeBlock, templateRestoreBlock } from '@/lib/company/template-rules'
import { folderBlock, type Folder } from '@/lib/company/folder-libraries'
import { useHere } from '@/components/om/use-here'

/**
 * Company › Templates › Contracts (REG-534 → REG-538): the shared library gallery with the contract kind's pieces — a paper
 * thumbnail, "Starts with" as a column, New template ▾ (Blank · From the studio agreement · From a contract…), and the kebab's
 * "New contract from this template" (a lead picker, then the editor). No versions, no approval (owner 2026-09-18).
 */
export function ContractTemplatesGallery({ data, brand, studio, values, from, folders = [] }: { data: ContractTemplatesData; folders?: Folder[]; brand: BrandKit; studio: StudioDetails; values: TokenValues; from?: string }) {
  const { templates, deleted, leads, now } = data
  const router = useRouter()
  const { run, fail } = useRun()
  const [creating, setCreating] = useState(false)
  const snackbar = useSnackbar()
  /* (REG-634, contracts parity E-132) Deleted from its editor: said here, with the gallery's Undo, once. */
  const params = useSearchParams(), pathname = usePathname()
  const deletedId = params.get('deleted')
  useEffect(() => {
    if (!deletedId) return
    const t = data.deleted.find((x) => x.id === deletedId)
    const rest = new URLSearchParams(params.toString()); rest.delete('deleted')
    router.replace(`${pathname}${rest.toString() ? `?${rest}` : ''}`, { scroll: false })
    if (t) snackbar({ message: `${t.title} deleted`, actionLabel: 'Undo', onAction: () => { void run('restore the template', () => restoreContractTemplates([t.id]), `${t.title} restored`).then(() => router.refresh()) } })
  }, [deletedId])   // eslint-disable-line react-hooks/exhaustive-deps -- once per arrival
  const [pickFor, setPickFor] = useState<string | null>(null)
  /* the folder open when "From a contract…" was pressed (undefined = closed) — the template made from it is filed there */
  const [fromContract, setFromContract] = useState<string | null | undefined>(undefined)
  /* (pending modules S03) Upload a PDF… — the folder open when it was pressed (undefined = closed), filed there */
  const [uploadIn, setUploadIn] = useState<string | null | undefined>(undefined)
  const isPdf = (t: ContractTemplateRow) => t.kind === 'pdf'
  const pdfThumb = (t: ContractTemplateRow) => `/files/contract-template/${t.id}?thumb=1&v=${t.updatedAt.getTime()}`
  const kind = templateKind('contracts')!
  const here = useHere('/company/templates/contracts')   // (round 3) the open folder and search ride along
  const open = useCallback((id: string) => router.push(`/templates/contracts/${id}?from=${encodeURIComponent(here)}`), [router, here])
  useRememberContractPdfs(templates.map((t) => ({ id: t.id, pdf: t.kind === 'pdf' })))   // (S42 B-17) a PDF template's loader draws its PDF
  /* (wave E, E7) a refusal answers { error: the rule } — said after "Couldn’t …", never an editor opened on "[object Object]" */
  const create = async (fn: () => Promise<unknown>, what: string) => { try { open(await newIdOf(fn())) } catch (e) { fail(what, reasonOf(e)) } }
  const loadContracts = useCallback(async (): Promise<PickOption[]> => (await fetchContractOptionsAction()).map((c) => ({ id: c.id, label: c.title, sub: c.leadName })), [])

  return (
    <LibraryGallery<ContractTemplateRow> kind={kind} from={from} folders={{ library: 'contracts', list: folders, block: folderBlock(data.viewer) }} items={templates} deleted={deleted} now={now} ariaLabel="Contract templates" mayChange={(t) => templateChangeBlock(data.viewer, t.createdBy)} tableKey="contract-templates"
      newMenu={(close, place) => (<>   {/* (Dane UAT 3.03) a template made inside a folder is filed there */}
        <DropdownItem onSelect={() => { close(); void create(() => createContractTemplate({ source: { kind: 'blank' }, folderId: place.folderId }), 'create the template') }}>Blank template</DropdownItem>
        <DropdownItem onSelect={() => { close(); void create(() => createContractTemplate({ source: { kind: 'starter' }, folderId: place.folderId }), 'create the template') }}>From the studio agreement</DropdownItem>
        <DropdownDivider />
        <DropdownItem onSelect={() => { close(); setFromContract(place.folderId) }}>From a contract…</DropdownItem>
        {/* (pending modules S03 — 1.0's signing library) a standard PDF that goes with signings */}
        <DropdownItem onSelect={() => { close(); setUploadIn(place.folderId) }} help="Terms, a warranty — added to signings">Upload a PDF…</DropdownItem>
      </>)}
      filters={[{ key: 'used', label: 'In use', test: (t) => t.usedBy > 0 }, { key: 'unused', label: 'Not used yet', test: (t) => t.usedBy === 0 }]}
      searchText={(t) => (isPdf(t) ? `${t.fileName ?? ''} PDF` : excerptOf(t.body, 400))}
      /* (pending modules S03) a standard PDF shows its first page */
      thumb={(t) => (isPdf(t) ? <span className={own.thumbPage}>{/* eslint-disable-next-line @next/next/no-img-element */}<img className={own.thumbPdf} src={pdfThumb(t)} alt="" /></span>
        : <span className={own.thumbPage}><span className={own.thumbScale}><ContractPaper html={t.body} values={values} brand={brand} studio={studio} studioSignature={null} client={null} compact width={600} /></span></span>)}
      glyph={(t) => (isPdf(t) ? <span className={own.pdfGlyph}><Icon name="picture_as_pdf" size={24} fill /></span> : <span className={styles.glyph} data-lines={Math.min(6, Math.max(2, outlineOf(t.body).length))}><span className={styles.glyphTitle} /><span className={styles.glyphLines} /></span>)}
      meta={(t) => { if (isPdf(t)) return `PDF${t.fileSize ? ` · ${fileSize(t.fileSize)}` : ''} · added to signings`; const n = outlineOf(t.body).length; return `${n} ${n === 1 ? 'heading' : 'headings'} · ${excerptOf(t.body, 60) || 'empty page'}` }}
      usage={(t) => (t.usedBy === 0 ? 'Not used yet' : `Used by ${t.usedBy} ${t.usedBy === 1 ? 'contract' : 'contracts'}`)}
      usageWord={(t) => (t.usedBy === 0 ? '--' : `${t.usedBy} contract${t.usedBy === 1 ? '' : 's'}`)}
      columns={[{ key: 'excerpt', label: 'Starts with', track: '320px', cell: (t) => <span className={`${styles.oneLine} ${styles.muted}`}>{isPdf(t) ? `PDF · ${t.fileName ?? t.title}` : excerptOf(t.body, 120) || '—'}</span> }, { key: 'used', label: 'Used by', track: '140px', sortable: true, cell: (t) => (t.usedBy > 0 ? <span>{t.usedBy} contract{t.usedBy === 1 ? '' : 's'}</span> : <span className={styles.muted}>Not used yet</span>) }]}
      onOpen={(t) => open(t.id)}
      chips={(t) => (t.isDefault || isPdf(t) || t.useAtHandover ? <>{t.isDefault ? <MetaChip>Default</MetaChip> : null}{t.useAtHandover ? <MetaChip>At handover</MetaChip> : null}{isPdf(t) ? <MetaChip>PDF</MetaChip> : null}</> : null)}   /* (REG-632, parity Q-13) · (pending modules S03) a standard PDF says so · (S44R, C9) the completion letter */
      kebab={(t) => [
        { label: 'New contract from this template', onSelect: () => setPickFor(t.id) },
        { label: 'Set as default', disabled: t.isDefault || !!templateDefaultBlock(data.viewer), title: templateDefaultBlock(data.viewer) ?? (t.isDefault ? 'Already the default' : 'Contracts raised from a quote or the Won step start from it'), onSelect: () => { void run('set the default', () => setDefaultContractTemplate(t.id), `${t.title} is the default contract template`) } },
        /* (S44R — UAT row 359, call C9) the completion letter the Hand over sheet offers — one at a time (invented copy) */
        t.useAtHandover
          ? { label: 'Stop using at handover', disabled: !!templateDefaultBlock(data.viewer), title: templateDefaultBlock(data.viewer) ?? 'The Hand over sheet stops offering a completion letter', onSelect: () => { void run('change the handover letter', () => setHandoverContractTemplate(t.id, false), `${t.title} is no longer sent at handover`) } }
          : { label: 'Use at handover', disabled: isPdf(t) || !!templateDefaultBlock(data.viewer), title: templateDefaultBlock(data.viewer) ?? (isPdf(t) ? 'A standard PDF can’t be filled from the project' : 'The Hand over sheet offers it as the completion letter, filled from the project'), onSelect: () => { void run('use it at handover', () => setHandoverContractTemplate(t.id, true), `${t.title} is the completion letter at handover`) } },
      ]}
      onDuplicate={(t) => create(() => duplicateContractTemplate(t.id), 'duplicate the template')}
      onRename={(t, name) => renameContractTemplate(t.id, name)}
      onDelete={(t) => deleteContractTemplate(t.id)}
      deleteMessage={(t) => (t.usedBy ? `${t.usedBy} ${t.usedBy === 1 ? 'contract keeps its' : 'contracts keep their'} own copy of the document. You can restore the template from Deleted Templates.` : 'You can restore it from Deleted Templates.')}
      onRestore={(ids) => restoreContractTemplates(ids)} onDeleteForever={(ids) => deleteContractTemplatesForever(ids)} onEmptyTrash={() => emptyContractTemplateTrash()}
      deletedMeta={{ label: 'Starts with', value: (t) => (isPdf(t) ? `PDF · ${t.fileName ?? t.title}` : excerptOf(t.body, 40) || '—') }}
      keepReason={(t) => (t.usedBy ? `${t.usedBy} ${t.usedBy === 1 ? 'contract names' : 'contracts name'} it — kept while they do` : null)}   /* (REG-634, parity Q-21 · Q-24) */
      /* (verify round 3) the Deleted sheet offers only what the server allows — Restore and Delete Forever on a template the viewer wrote (or
         any, for an Owner or an Admin; lib/contracts/policy canDeleteTemplateForever is the same rule), said in the row as a whole sentence
         with its author's name (it read "Only its creator, an Owner or an Admin"); its person column is whoever saved it last */
      restoreBlock={(t) => templateRestoreBlock(data.viewer, t.createdBy, t.maker)} purgeRule={(t) => templatePurgeBlock(data.viewer, t.createdBy, t.maker)} deletedByLabel="Updated by"
      empty={{ title: 'No contract templates yet', help: 'Start from the studio agreement, or save any contract as a template from its editor.',
        /* (REG-735) the first run carries New ▾'s rows: the studio agreement first, a blank one, one of the studio's contracts */
        start: () => ({ primary: { label: 'From the studio agreement', onPress: () => { void create(() => createContractTemplate({ source: { kind: 'starter' } }), 'create the template') } },
          secondary: { label: 'Blank template', onPress: () => { void create(() => createContractTemplate({ source: { kind: 'blank' } }), 'create the template') } },
          link: { label: 'From a contract…', onPress: () => setFromContract(null) } }) }}>
      {/* (Dane UAT 8.02, REG-659) the lead question reads "Creating…" and stays until the editor takes over, as every contract picker does */}
      <PickLeadDialog open={!!pickFor} onClose={() => setPickFor(null)} leads={leads} busy={creating}
        onPick={async (leadId) => { const id = pickFor; if (!id || !leadId || creating) return; setCreating(true)
          try { const cid = await newIdOf(contractFromTemplate(id, leadId)); router.push(`/contracts/${cid}?from=${encodeURIComponent(here)}`) } catch (e) { fail('create the contract', reasonOf(e)); setCreating(false) } }} />
      <UploadPdfDialog open={uploadIn !== undefined} onClose={() => setUploadIn(undefined)}
                       onSave={async ({ title, file }) => { const folderId = uploadIn ?? null; try { const id = await newIdOf(createPdfTemplate({ title, file, folderId })); rememberContractPdf(id, true); setUploadIn(undefined); snackbar({ message: `${title} is in your templates — it goes with signings from Send together` }); open(id); return true } catch (e) { fail('add the PDF', reasonOf(e)); return false } }} />
      <PickOneDialog open={fromContract !== undefined} onClose={() => setFromContract(undefined)} title="Start from a contract" label="Contract" load={loadContracts} confirmLabel="Create template"
                     onPick={(id) => { const folderId = fromContract ?? null; setFromContract(undefined); void run('create the template', async () => open(await newIdOf(createContractTemplate({ source: { kind: 'contract', contractId: id }, folderId })))) }} />
    </LibraryGallery>
  )
}
