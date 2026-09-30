/**
 * (REG-735) The photos picked on the AI Visualizer's welcome ("Upload a room photo"), handed to the design they started. The landing makes
 * the design, keeps the picked files here under its id and opens the editor; the editor takes them once on arrival and adds each as a room —
 * its own upload path (readPicture · detection · addRoom), so a photo from the welcome is exactly a photo from the editor. Browser memory
 * only: it survives the client-side move to the editor, and a reload in between simply lands on the editor's own "Add the first room".
 */
const pending = new Map<string, File[]>()

export function stashPhotos(designId: string, files: File[]): void {
  pending.set(designId, files)
}

/** The photos waiting for this design — once: a second call (React's development double effect included) finds nothing. */
export function takePhotos(designId: string): File[] | null {
  const files = pending.get(designId) ?? null
  pending.delete(designId)
  return files
}
