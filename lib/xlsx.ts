/**
 * (REG-603) A small XLSX reader for the lead import — the first worksheet as a grid of strings, no dependency.
 *
 * An .xlsx is a zip: this walks the local file headers, inflates each entry with the browser's DecompressionStream
 * ('deflate-raw'), reads the shared strings and the first sheet's XML, and returns rows of cell text (dates and numbers as
 * the sheet stores them — the mapping step reads them as text, exactly as a CSV export would print them).
 */

const dec = new TextDecoder()

type Entry = { name: string; method: number; compressed: Uint8Array }

function entries(buf: ArrayBuffer): Entry[] {
  const view = new DataView(buf), bytes = new Uint8Array(buf)
  const out: Entry[] = []
  let p = 0
  while (p + 30 <= bytes.length && view.getUint32(p, true) === 0x04034b50) {
    const method = view.getUint16(p + 8, true)
    const flags = view.getUint16(p + 6, true)
    let size = view.getUint32(p + 18, true)
    const nameLen = view.getUint16(p + 26, true), extraLen = view.getUint16(p + 28, true)
    const name = dec.decode(bytes.subarray(p + 30, p + 30 + nameLen))
    const start = p + 30 + nameLen + extraLen
    if (flags & 0x8) {
      /* Sizes in a data descriptor after the data: find it through the central directory instead. */
      const cd = centralSizes(buf)
      size = cd.get(name) ?? 0
    }
    out.push({ name, method, compressed: bytes.subarray(start, start + size) })
    p = start + size
    if (flags & 0x8) p += 16   // the descriptor (signature + crc + sizes)
  }
  return out
}

function centralSizes(buf: ArrayBuffer): Map<string, number> {
  const view = new DataView(buf), bytes = new Uint8Array(buf)
  const sizes = new Map<string, number>()
  /* The end-of-central-directory record sits in the last 64 KB. */
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i -= 1) {
    if (view.getUint32(i, true) !== 0x06054b50) continue
    let p = view.getUint32(i + 16, true)
    while (p + 46 <= bytes.length && view.getUint32(p, true) === 0x02014b50) {
      const csize = view.getUint32(p + 20, true)
      const nameLen = view.getUint16(p + 28, true), extraLen = view.getUint16(p + 30, true), commentLen = view.getUint16(p + 32, true)
      sizes.set(dec.decode(bytes.subarray(p + 46, p + 46 + nameLen)), csize)
      p += 46 + nameLen + extraLen + commentLen
    }
    break
  }
  return sizes
}

async function inflate(e: Entry): Promise<string> {
  if (e.method === 0) return dec.decode(e.compressed)
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([e.compressed as BlobPart]).stream().pipeThrough(ds)
  return new Response(stream).text()
}

const unescape = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const colIndex = (ref: string) => { let n = 0; for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1 }

/** The first worksheet as rows of text; empty when the file is not a spreadsheet. */
export async function parseXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const list = entries(buf)
  const byName = new Map(list.map((e) => [e.name, e]))
  const sst = byName.get('xl/sharedStrings.xml')
  const strings: string[] = []
  if (sst) {
    const xml = await inflate(sst)
    for (const si of xml.match(/<si>[\s\S]*?<\/si>/g) ?? []) strings.push(unescape((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => t.replace(/<t[^>]*>|<\/t>/g, '')).join('')))
  }
  const sheetName = [...byName.keys()].filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0]
  const sheet = sheetName ? byName.get(sheetName) : undefined
  if (!sheet) return []
  const xml = await inflate(sheet)
  const rows: string[][] = []
  for (const row of xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    const cells: string[] = []
    for (const c of row.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) ?? []) {
      const ref = c.match(/\br="([A-Z]+)\d+"/)?.[1] ?? ''
      const idx = ref ? colIndex(ref) : cells.length
      const type = c.match(/\bt="(\w+)"/)?.[1]
      let value = ''
      if (type === 'inlineStr') value = unescape((c.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => t.replace(/<t[^>]*>|<\/t>/g, '')).join(''))
      else {
        const v = c.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? ''
        value = type === 's' ? strings[Number(v)] ?? '' : unescape(v)
      }
      while (cells.length < idx) cells.push('')
      cells[idx] = value
    }
    rows.push(cells)
  }
  /* Ragged rows read as a rectangle. */
  const width = Math.max(0, ...rows.map((r) => r.length))
  return rows.map((r) => [...r, ...Array.from({ length: width - r.length }, () => '')]).filter((r) => r.some((c) => c.trim() !== ''))
}
