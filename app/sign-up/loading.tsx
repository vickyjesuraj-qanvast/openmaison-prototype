import { StudioSignUpGhost } from '@/components/auth/studio-sign-up'
import { signUpsPaused } from '@/lib/studios/create'
import { studiosHome } from '@/lib/studios/registry'
import { signUpBlock } from '@/lib/studios/model'

/** (REG-708) Sign-up's own ghost — the page's PageReveal draws the same one (the notice too, while sign-ups can't start here). */
export default function Loading() {
  return <StudioSignUpGhost blocked={signUpBlock({ paused: signUpsPaused(), canStart: studiosHome() !== null })} />
}
