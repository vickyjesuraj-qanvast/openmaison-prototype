/**
 * (gaps build D, item 2 — M-07 "The client can say no") The words and limits of a client's no, pure and client-safe — the portal's Choices,
 * the variation order's confirmation link, the studio's card and Money read the same ones.
 *
 * On a choice the client picks *None of these work* and then one of two answers (1.0's Reject · Request changes, I-284): **Turn them down**
 * (they want none of it) or **Ask for other options** (the idea is right, the options are not) — each with a reason, required. On a variation
 * order: **Decline** with a reason (1.0's ✗ Reject, I-293).
 */

export const DECLINE_NOTE_MAX = 500

export type ChoiceAnswer = 'reject' | 'other_options'
export const isChoiceAnswer = (v: unknown): v is ChoiceAnswer => v === 'reject' || v === 'other_options'
/** The two answers as the client picks them, and how the studio reads each. */
export const CHOICE_ANSWERS: readonly { key: ChoiceAnswer; label: string; help: string; studio: string; chip: string }[] = [
  { key: 'other_options', label: 'Ask for other options', help: 'The idea is right, but none of these', studio: 'asked for other options', chip: 'Other options asked' },
  { key: 'reject', label: 'Turn them down', help: 'You don’t want any of these', studio: 'turned these down', chip: 'Turned down' },
]
export const answerOf = (k: ChoiceAnswer) => CHOICE_ANSWERS.find((a) => a.key === k)!
/** The reason box's label for an answer. */
export const answerAsk = (k: ChoiceAnswer) => (k === 'reject' ? 'Why not? (your designer reads this)' : 'What would you like instead?')
/** The refusal when the reason is empty — the house message's shape ("Say …, so …"). */
export const answerNeedsWhy = (k: ChoiceAnswer) => (k === 'reject' ? 'Say why, so your designer knows' : 'Say what you’d like instead, so your designer can find it')
/** The client's own line once answered: "You turned these down on 6 Oct" · "You asked for other options on 6 Oct". */
export const answerLine = (k: ChoiceAnswer, who: string, day: string) => `${who} ${k === 'reject' ? 'turned these down' : 'asked for other options'} on ${day}`
