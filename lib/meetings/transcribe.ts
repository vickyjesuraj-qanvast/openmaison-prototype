import 'server-only'
import { serviceSlot } from '@/lib/services/slots'

/*
 * (pending modules S34 — the steps' note after S23: "a transcriber plugs into the notes box / writeUpMeeting"; 1.0's COPILOT_STT_PROVIDER ·
 * DEEPGRAM_API_KEY · SPEECHMATICS_API_KEY) A recording into words, plugged in at one slot. Its contract: an uploaded recording (its name and
 * its data URL — audio up to 8 MB, the Files limit) in, the words out (speakers as "Name: …" lines when the service tells them apart), or why
 * not. THE STAND-IN turns nothing into words and the write-up dialog says so (`TRANSCRIBE_STAND_IN`): the studio pastes the transcript or
 * its notes. PRODUCTION: `setTranscriber(t)` once at start-up and build with `NEXT_PUBLIC_TRANSCRIPTION=1` — the dialog then takes a
 * recording with no notes (lib/meetings/model.ts `TRANSCRIBES`) and `writeUpMeeting` writes the meeting up from the words it answers; the
 * brief is made from them by the same rule (`briefOf`). The live co-pilot's listening (1.0's Deepgram stream in the room) is a stream, not
 * a file — it stays the room's typed notes (LISTENING_STAND_IN) until the developers bring a streaming service.
 */
export type Transcriber = { name: string; transcribe(audio: { name: string; dataUrl: string }): Promise<{ text: string } | { error: string }> }
const NONE: Transcriber = { name: 'none', transcribe: async () => ({ error: 'Turning a recording into words isn’t connected in this prototype' }) }
const slot = serviceSlot<Transcriber>('transcription', NONE)
/** PRODUCTION: plug the transcriber in once, at start-up (lib/services/install.ts). */
export function setTranscriber(t: Transcriber): void { slot.set(t) }
export const transcriberIsStandIn = (): boolean => slot.standIn()
/** The recording's words, or why not. Never throws. */
export async function transcribeRecording(audio: { name: string; dataUrl: string }): Promise<{ text: string } | { error: string }> {
  try {
    const r = await slot.use().transcribe(audio)
    return 'text' in r && typeof r.text === 'string' && r.text.trim() ? { text: r.text.slice(0, 100_000) } : { error: 'error' in r ? r.error : 'The recording had no words to read' }
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) } }
}
