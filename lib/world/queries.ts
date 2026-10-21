import 'server-only'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { CODE_REGEX, ENTITY_SLUGS, PREFIX_TO_SLUG, type EntitySlug } from '@/lib/codes'

const UNK_TAG_ID = 1

export function isUnk(tags: (number | { id: number; code?: string | null })[] | null | undefined): boolean {
  if (!tags) return false
  return tags.some(t => (typeof t === 'object' ? t.id : t) === UNK_TAG_ID)
}

export async function getCollectionList(collection: string) {
  const payload = await getPayload({ config })
  return payload.find({
    collection: collection as EntitySlug,
    limit: 500,
    depth: 1,
    sort: 'code',
  })
}

export async function getEntryByCode(collection: string, code: string) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: collection as EntitySlug,
    where: { code: { equals: code.toUpperCase() } },
    depth: 2,
    limit: 1,
  })
  return docs[0] ?? null
}

export async function getEntryBySlug(collection: string, slug: string) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: collection as EntitySlug,
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })
  return docs[0] ?? null
}

export async function getSubItems(collection: string, parentId: number) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: collection as EntitySlug,
    where: { parent: { equals: parentId } },
    depth: 1,
    limit: 100,
    sort: 'code',
  })
  return docs
}

export async function getRelationshipsByCode(code: string) {
  const payload = await getPayload({ config })
  const [fromResult, toResult] = await Promise.all([
    payload.find({
      collection: 'relationships',
      where: { fromCode: { equals: code } },
      depth: 1,
      limit: 100,
    }),
    payload.find({
      collection: 'relationships',
      where: { toCode: { equals: code } },
      depth: 1,
      limit: 100,
    }),
  ])
  return { from: fromResult.docs, to: toResult.docs }
}

export async function getEventsInvolving(entryId: number) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'events',
    limit: 500,
    depth: 1,
    sort: 'startYear',
  })
  return docs.filter(event => {
    const inv = event.involves as { value?: { id?: number } | number; relationTo?: string }[] | null | undefined
    if (!inv) return false
    return inv.some(item => {
      const val = item?.value
      return typeof val === 'object' ? val?.id === entryId : val === entryId
    })
  })
}

export async function getEventsList() {
  const payload = await getPayload({ config })
  return payload.find({
    collection: 'events',
    limit: 500,
    depth: 1,
    sort: 'startYear',
  })
}

export async function getEventByCode(code: string) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'events',
    where: { code: { equals: code.toUpperCase() } },
    depth: 2,
    limit: 1,
  })
  return docs[0] ?? null
}

export async function getEventBySlug(slug: string) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })
  return docs[0] ?? null
}

export async function getStoriesList() {
  const payload = await getPayload({ config })
  return payload.find({
    collection: 'stories',
    limit: 200,
    depth: 1,
    sort: 'code',
  })
}

export async function getStoryByCode(code: string) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'stories',
    where: { code: { equals: code.toUpperCase() } },
    depth: 2,
    limit: 1,
  })
  return docs[0] ?? null
}

export async function getUnkRecords() {
  const collections = [...ENTITY_SLUGS, 'relationships'] as string[]
  const payload = await getPayload({ config })
  const results = await Promise.all(
    collections.map(async (collection) => {
      const { docs, totalDocs } = await payload.find({
        collection: collection as EntitySlug,
        where: { tags: { equals: UNK_TAG_ID } },
        limit: 200,
        depth: 0,
        sort: 'code',
      })
      return { collection, docs, totalDocs }
    })
  )
  return results.filter(r => r.totalDocs > 0)
}

// Scan text fields for ID codes and return a map code -> { name, collection }
export async function buildCodeMap(texts: (string | null | undefined)[]): Promise<Record<string, { name: string; collection: string } | null>> {
  const codes = new Set<string>()
  for (const text of texts) {
    if (!text) continue
    const re = new RegExp(CODE_REGEX.source, 'g')
    for (const m of text.matchAll(re)) codes.add(`${m[1]}${m[2]}`)
  }
  if (codes.size === 0) return {}

  // Group by collection
  const byCollection = new Map<string, string[]>()
  for (const code of codes) {
    const collection = PREFIX_TO_SLUG[code[0]]
    if (!collection || collection === 'relationships' || collection === 'continuity-flags' || collection === 'tags') continue
    if (!byCollection.has(collection)) byCollection.set(collection, [])
    byCollection.get(collection)!.push(code)
  }

  const payload = await getPayload({ config })
  const map: Record<string, { name: string; collection: string } | null> = {}

  await Promise.all(
    Array.from(byCollection.entries()).map(async ([collection, codeBatch]) => {
      try {
        const { docs } = await payload.find({
          collection: collection as EntitySlug,
          where: { code: { in: codeBatch } },
          limit: codeBatch.length,
          depth: 0,
        })
        for (const doc of docs) {
          const d = doc as { code?: string | null; name?: string; title?: string }
          if (d.code) map[d.code] = { name: (d.name ?? d.title ?? d.code), collection }
        }
      } catch {
        // collection may not support this query; skip
      }
    })
  )

  for (const code of codes) {
    if (!(code in map)) map[code] = null
  }

  return map
}

// Fetch all records for the world tree (light: id, code, name, parent, collection-specific grouping fields)
export async function getWorldTreeNodes() {
  const payload = await getPayload({ config })
  const WORLD_COLLECTIONS = ['characters', 'locations', 'items', 'cultures', 'factions', 'races', 'languages', 'lore'] as const
  const STORY_COLLECTIONS = ['events', 'stories'] as const
  const ALL = [...WORLD_COLLECTIONS, ...STORY_COLLECTIONS]

  const results = await Promise.all(
    ALL.map(col => payload.find({
      collection: col as EntitySlug,
      limit: 500,
      depth: 1,
      sort: 'code',
    }))
  )

  type RawNode = {
    id: number; code?: string | null; name?: string | null; title?: string | null;
    parent?: { id: number; code?: string | null } | number | null;
    image?: { sizes?: { thumbnail?: { url?: string | null } | null }; url?: string | null } | number | null;
    involves?: { value?: { id?: number; code?: string | null } | number; relationTo?: string }[] | null;
    culture?: { id?: number; code?: string | null } | number | null;
    era?: string | null;
  }

  const nodes: {
    id: number; code: string; name: string; collection: string;
    parentId?: number | null; parentCode?: string | null;
    storyCode?: string | null; cultureCode?: string | null; era?: string | null;
    image?: string | null;
  }[] = []

  for (let i = 0; i < ALL.length; i++) {
    const col = ALL[i]
    for (const doc of results[i].docs) {
      const d = doc as RawNode
      const parentObj = typeof d.parent === 'object' && d.parent ? d.parent : null
      const cultureObj = typeof d.culture === 'object' && d.culture ? d.culture : null
      const imgObj = typeof d.image === 'object' && d.image ? d.image : null
      const thumbUrl = imgObj?.sizes?.thumbnail?.url ?? imgObj?.url ?? null

      nodes.push({
        id: d.id,
        code: d.code ?? '',
        name: d.name ?? d.title ?? '',
        collection: col,
        parentId: parentObj?.id ?? null,
        parentCode: parentObj?.code ?? null,
        cultureCode: cultureObj?.code ?? null,
        era: d.era ?? null,
        image: thumbUrl ?? null,
      })
    }
  }

  return nodes
}

// Get an entry by code (any collection), for the code lookup box
export async function resolveCodeLookup(query: string) {
  const payload = await getPayload({ config })
  const q = query.trim().toUpperCase()
  // Try as an exact code first
  const re = new RegExp(`^[CLEIFRGKSWXQTU]\\d{1,6}$`)
  if (re.test(q)) {
    const collection = PREFIX_TO_SLUG[q[0]]
    if (collection && ENTITY_SLUGS.includes(collection as EntitySlug)) {
      const { docs } = await payload.find({
        collection: collection as EntitySlug,
        where: { code: { equals: q } },
        limit: 1,
        depth: 0,
      })
      if (docs[0]) return { code: q, collection, name: (docs[0] as { name?: string; title?: string }).name ?? (docs[0] as { title?: string }).title ?? q }
    }
  }
  // Try as a name search across world collections
  const searchResults = await Promise.all(
    ENTITY_SLUGS.map(async (collection) => {
      const { docs } = await payload.find({
        collection,
        where: { name: { like: query } },
        limit: 3,
        depth: 0,
      })
      return docs.map(d => {
        const doc = d as { code?: string | null; name?: string; title?: string }
        return { code: doc.code ?? '', collection, name: doc.name ?? doc.title ?? doc.code ?? '' }
      })
    })
  )
  return searchResults.flat().find(r => r.code) ?? null
}
