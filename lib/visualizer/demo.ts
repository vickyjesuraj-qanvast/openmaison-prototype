import type { FurniturePick } from './furniture'

/* AI Visualizer (REG-673, repair R61) — the demo design's pre-rendered edit, in one place: `scripts/viz/demo-renders.mts` paints these picks
   with the engine the browser runs (same regions, same colours, same order) and the repair records the same picks on the version, so the
   picture and what the version says it changed agree (REG-343). Re-run the harness if the engine or the living-room sample changes. */

export const DEMO_EDIT = {
  sample: 'living-room',
  surfaces: [
    { label: 'cream painted side wall', material: 'paint-002' },
    { label: 'cream painted back wall', material: 'paint-002' },
    { label: 'cream painted TV wall', material: 'paint-002' },
    { label: 'beige stone floor', material: 'floor-006' },
  ],
  furniture: [
    { label: 'cream bouclé sofa', pick: { action: 'customize', customizeColor: 'Emerald', customizeMaterial: 'Velvet', replacementDesc: null, refImage: null } satisfies FurniturePick },
  ],
  image: '/visualizer/demo/living-room-edit.jpg',
  /** The edit relit (a relight pass on the edit, the preset's own knobs). */
  relit: { preset: 'golden-hour', image: '/visualizer/demo/living-room-edit-golden-hour.jpg' },
  /** Swatch photos for two studio materials, cut from the pictures they came from; `hex` is what each reads as (the harness prints it). */
  swatches: {
    walnut: { image: '/visualizer/demo/swatch-walnut.jpg', hex: '#67483A', from: '/visualizer/demo/living-room-edit.jpg', box: [0.885, 0.88, 0.99, 0.99] as const },
    oak: { image: '/visualizer/demo/swatch-oak.jpg', hex: '#7D5D41', from: '/visualizer/samples/kitchen/original.jpg', box: [0.66, 0.1, 0.745, 0.32] as const },
  },
} as const
