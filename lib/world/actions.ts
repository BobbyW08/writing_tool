'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { revalidatePath } from 'next/cache'
import type { EntitySlug } from '@/lib/codes'

// Updates an event's startYear after a timeline drag.
export async function updateEventYearAction(id: string, year: number) {
  const payload = await getPayload({ config })
  await payload.update({
    collection: 'events',
    id: Number(id),
    data: { startYear: Math.round(year) },
    depth: 0,
  })
  revalidatePath('/timeline')
}

// Quick search for the code lookup box.
export async function searchForEntry(query: string): Promise<{ code: string; collection: string } | null> {
  const { resolveCodeLookup } = await import('@/lib/world/queries')
  const result = await resolveCodeLookup(query)
  if (!result) return null
  return { code: result.code, collection: result.collection }
}

// Create a new record in any world collection.
export async function createEntityAction(
  collection: string,
  data: Record<string, unknown>
): Promise<{ id: number; code?: string; slug?: string; error?: string }> {
  try {
    const payload = await getPayload({ config })
    const doc = await payload.create({
      collection: collection as EntitySlug,
      data: data as never,
      depth: 0,
    })
    const d = doc as { id: number; code?: string; slug?: string }
    revalidatePath(`/${collection}`)
    return { id: d.id, code: d.code, slug: d.slug }
  } catch (err) {
    return { id: 0, error: String(err) }
  }
}

// Update a single scalar field on any record.
export async function updateFieldAction(
  collection: string,
  id: number,
  field: string,
  value: unknown
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload = await getPayload({ config })
    await payload.update({
      collection: collection as EntitySlug,
      id,
      data: { [field]: value } as never,
      depth: 0,
    })
    revalidatePath(`/${collection}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// Replace the details array on a record.
export async function updateDetailsAction(
  collection: string,
  id: number,
  details: { label: string; value: string; inInfobox: boolean; id?: string }[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload = await getPayload({ config })
    await payload.update({
      collection: collection as EntitySlug,
      id,
      data: { details } as never,
      depth: 0,
    })
    revalidatePath(`/${collection}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// Check what still points at a record before deleting it.
export async function checkDeleteConflictsAction(
  collection: string,
  id: number,
  code: string
): Promise<{ conflicts: { collection: string; code: string; name: string }[] }> {
  const payload = await getPayload({ config })
  const conflicts: { collection: string; code: string; name: string }[] = []

  // Relationships with fromCode or toCode matching
  const [fromRels, toRels] = await Promise.all([
    payload.find({ collection: 'relationships', where: { fromCode: { equals: code } }, limit: 20, depth: 0 }),
    payload.find({ collection: 'relationships', where: { toCode: { equals: code } }, limit: 20, depth: 0 }),
  ])
  for (const r of [...fromRels.docs, ...toRels.docs]) {
    const rel = r as { code?: string; toCode?: string; fromCode?: string }
    conflicts.push({
      collection: 'relationships',
      code: (r as { code?: string }).code ?? String(r.id),
      name: `Relationship ${rel.fromCode} -> ${rel.toCode}`,
    })
  }

  // Children in same collection with parent = this record
  const { docs: children } = await payload.find({
    collection: collection as EntitySlug,
    where: { parent: { equals: id } },
    limit: 20,
    depth: 0,
  })
  for (const c of children) {
    const child = c as { id: number; code?: string; name?: string; title?: string }
    conflicts.push({
      collection,
      code: child.code ?? String(child.id),
      name: child.name ?? child.title ?? child.code ?? String(child.id),
    })
  }

  // Events that involve this record
  const { docs: events } = await payload.find({
    collection: 'events',
    limit: 500,
    depth: 1,
    sort: 'startYear',
  })
  for (const ev of events) {
    const involves = ev.involves as { value?: { id?: number } | number; relationTo?: string }[] | null | undefined
    if (!involves) continue
    const found = involves.some(item => {
      const val = item?.value
      return typeof val === 'object' ? val?.id === id : val === id
    })
    if (found) {
      const e = ev as { code?: string; name?: string }
      conflicts.push({ collection: 'events', code: e.code ?? String(ev.id), name: e.name ?? String(ev.id) })
    }
  }

  // Stories that dramatize this event
  if (collection === 'events') {
    const { docs: stories } = await payload.find({
      collection: 'stories',
      where: { dramatizes: { equals: id } },
      limit: 20,
      depth: 0,
    })
    for (const s of stories) {
      const story = s as { code?: string; name?: string }
      conflicts.push({
        collection: 'stories',
        code: story.code ?? String(s.id),
        name: story.name ?? String(s.id),
      })
    }
  }

  return { conflicts }
}

// Delete a record. Caller must have verified no conflicts first.
export async function deleteEntityAction(
  collection: string,
  id: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload = await getPayload({ config })
    await payload.delete({ collection: collection as EntitySlug, id })
    revalidatePath(`/${collection}`)
    revalidatePath('/')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// Add a relationship between two records.
export async function createRelationshipAction(
  fromCode: string,
  toCode: string,
  type: string,
  notes?: string
): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    const payload = await getPayload({ config })
    const { PREFIX_TO_SLUG } = await import('@/lib/codes')
    const fromCollection = PREFIX_TO_SLUG[fromCode[0]]
    const toCollection = PREFIX_TO_SLUG[toCode[0]]
    if (!fromCollection || !toCollection) return { ok: false, error: 'Unknown code prefix' }

    // Resolve IDs
    const [fromResult, toResult] = await Promise.all([
      payload.find({ collection: fromCollection as EntitySlug, where: { code: { equals: fromCode } }, limit: 1, depth: 0 }),
      payload.find({ collection: toCollection as EntitySlug, where: { code: { equals: toCode } }, limit: 1, depth: 0 }),
    ])
    const fromDoc = fromResult.docs[0]
    const toDoc = toResult.docs[0]
    if (!fromDoc || !toDoc) return { ok: false, error: 'One or both records not found' }

    const rel = await payload.create({
      collection: 'relationships',
      data: {
        from: { relationTo: fromCollection, value: fromDoc.id },
        to: { relationTo: toCollection, value: toDoc.id },
        fromCode,
        toCode,
        type,
        notes: notes ?? null,
      } as never,
      depth: 0,
    })
    return { ok: true, id: rel.id }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// Remove a relationship by its database id.
export async function deleteRelationshipAction(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'relationships', id })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// Toggle the UNK tag on a record and optionally update the reviewNote.
export async function updateTagsAction(
  collection: string,
  id: number,
  tagIds: number[],
  reviewNote?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload = await getPayload({ config })
    const updateData: Record<string, unknown> = { tags: tagIds }
    if (reviewNote !== undefined) updateData.reviewNote = reviewNote
    await payload.update({
      collection: collection as EntitySlug,
      id,
      data: updateData as never,
      depth: 0,
    })
    revalidatePath(`/${collection}`)
    revalidatePath('/review')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// Upload a media file and return the new media record id and URL.
// This is called from a client component via a fetch to /api/media/upload (handled by Payload's upload collection API).
// The infobox uses the standard Payload REST API endpoint for uploads, not a custom server action,
// because server actions cannot receive File/Blob objects from FormData in Next.js App Router.
// See: app/(app)/[entityType]/[slug]/page.tsx -- the Infobox component handles this via fetch.

// Attach an existing media record id to a record (or null to detach).
export async function attachImageAction(
  collection: string,
  id: number,
  mediaId: number | null
): Promise<{ ok: boolean; error?: string }> {
  return updateFieldAction(collection, id, 'image', mediaId)
}

// Update involves array on an event.
export async function updateEventInvolvesAction(
  eventId: number,
  involves: { relationTo: string; value: number }[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'events',
      id: eventId,
      data: { involves } as never,
      depth: 0,
    })
    revalidatePath('/events')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
