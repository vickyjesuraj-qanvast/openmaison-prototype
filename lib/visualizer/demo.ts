import type { FurniturePick } from './furniture'

/* AI Visualizer (REG-673, repair R61) — the demo design's pre-rendered edit, in one place: `scripts/viz/demo-renders.mts` paints these picks
   with the engine the browser runs (same regions, same colours, same order) and the repair records the same picks on the version, so the
   picture and what the version says it changed agree (REG-343). Re-run the harness if the engine or the living-room sample changes. */

export const DEMO_EDIT = {
  sample: 'living-room',
  surfaces: [
    { label: 'white painted back wall', material: 'paint-002' },
    { label: 'white wall above the window', material: 'paint-002' },
    { label: 'light oak floor', material: 'floor-006' },
  ],
  furniture: [
    { label: 'grey fabric sofa', pick: { action: 'customize', customizeColor: 'Emerald', customizeMaterial: 'Velvet', replacementDesc: null, refImage: null } satisfies FurniturePick },
  ],
  image: '/visualizer/demo/living-room-edit.jpg',
  /** The edit relit (a relight pass on the edit, the preset's own knobs). */
  relit: { preset: 'golden-hour', image: '/visualizer/demo/living-room-edit-golden-hour.jpg' },
  /** Swatch photos for two studio materials, cut from the pictures they came from; `hex` is what each reads as (the harness prints it). */
  swatches: {
    walnut: { image: '/visualizer/demo/swatch-walnut.jpg', hex: '#604337', from: '/visualizer/demo/living-room-edit.jpg', box: [0.84, 0.86, 0.99, 0.99] as const },
    oak: { image: '/visualizer/demo/swatch-oak.jpg', hex: '#81623E', from: '/visualizer/samples/bedroom/original.jpg', box: [0.875, 0.22, 0.985, 0.5] as const },
  },
} as const
