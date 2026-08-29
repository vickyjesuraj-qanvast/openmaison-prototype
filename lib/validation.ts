import { z } from 'zod'

/**
 * Auth input validation only. Domain schemas were REMOVED — they were invented
 * before the mocks were available.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address')
  .transform((value) => value.toLowerCase())

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export type SignInInput = z.infer<typeof signInSchema>

/** Shape returned by every server action, consumed by `useActionState`. */
export type ActionState = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
}

export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return fieldErrors
}
