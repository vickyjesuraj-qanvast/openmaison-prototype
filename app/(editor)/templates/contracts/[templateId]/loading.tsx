import { TemplateRouteGhost } from '@/components/contracts/template-screen/template-ghost'

/** Streams instantly while the template loads; PageReveal takes over the same skeleton — the contract editor's own (sweep S2 #22).
    (Contracts on the move, P-10) At ≤1024 it is the reading screen's shape (or the screen `?edit=` opens), from 1025 up the desk editor's. */
export default function Loading() {
  return <TemplateRouteGhost />   // (S42 B-17) a PDF one draws its PDF — the shape this browser remembers
}
