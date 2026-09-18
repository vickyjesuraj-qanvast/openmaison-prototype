/** Browser-side file helpers for the brand kit and "Recreate from my current quote" (client-only). */

/** A picked image as a data URL, downscaled to `max` px on its long side; SVGs and non-images are read as they are. */
export function readFileAsDataUrl(file: File, max = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const url = String(reader.result)
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || typeof Image === 'undefined') { resolve(url); return }
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        if (scale >= 1) { resolve(url); return }
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
        const ctx = c.getContext('2d')
        if (!ctx) { resolve(url); return }
        ctx.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9))
      }
      img.onerror = () => resolve(url)
      img.src = url
    }
    reader.readAsDataURL(file)
  })
}

export const fileSizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)
