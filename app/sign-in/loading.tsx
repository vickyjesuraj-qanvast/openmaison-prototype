import { StudioSignInGhost } from '@/components/auth/studio-sign-in'
import { isStandInProvider } from '@/lib/auth/provider'
import { signUpsPaused } from '@/lib/studios/create'

/** (REG-708) Sign-in's own ghost — the page's PageReveal draws the same one. */
export default function Loading() {
  return <StudioSignInGhost demo={isStandInProvider()} signUps={signUpsPaused() ? 'paused' : 'open'} />
}
