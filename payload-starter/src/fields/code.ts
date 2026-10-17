import type { CollectionBeforeValidateHook, Field } from 'payload'

// The permanent ID field. Read-only in the admin, assigned automatically on create.
export const codeField: Field = {
  name: 'code',
  type: 'text',
  label: 'ID',
  unique: true,
  index: true,
  // Not marked required on purpose: the admin form would block saving a new record before the hook
  // below has had a chance to assign the code. The hook always sets it, and `unique` still applies.
  admin: {
    readOnly: true,
    position: 'sidebar',
    description: 'Permanent ID. Type this in your writing to reference this entry.',
  },
}

/**
 * Hands out the next number for a prefix, using the hidden Counters collection.
 * Numbers only go up, so a code is never reused, even after a delete.
 *
 * Import support: if a code is supplied on create (for example C10 during the migration),
 * it is kept and the counter is moved past it.
 */
export const assignCode =
  (prefix: string): CollectionBeforeValidateHook =>
  async ({ data, operation, originalDoc, req }) => {
    // Codes are permanent: ignore any attempt to change one.
    if (operation === 'update') {
      return { ...data, code: originalDoc?.code }
    }
    if (operation !== 'create') return data

    const { payload } = req
    const found = await payload.find({
      collection: 'counters',
      where: { prefix: { equals: prefix } },
      limit: 1,
      depth: 0,
      req,
    })
    const counter = found.docs[0] as { id: number | string; next: number } | undefined

    const supplied = typeof data?.code === 'string' ? data.code.trim().toUpperCase() : ''
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(supplied)

    let number: number
    let nextCounter: number
    if (match) {
      number = Number(match[1])
      nextCounter = Math.max(counter?.next ?? 1, number + 1)
    } else {
      number = counter?.next ?? 1
      nextCounter = number + 1
    }

    if (counter) {
      await payload.update({
        collection: 'counters',
        id: counter.id,
        data: { next: nextCounter },
        req,
      })
    } else {
      await payload.create({
        collection: 'counters',
        data: { prefix, next: nextCounter },
        req,
      })
    }

    return { ...data, code: `${prefix}${number}` }
  }
