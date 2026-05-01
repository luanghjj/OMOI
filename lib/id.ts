import { createId } from '@paralleldrive/cuid2'

/** Generate a cuid2-compatible ID for database records */
export function generateId(): string {
  return createId()
}
