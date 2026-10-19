import type { Endpoint, PayloadRequest } from 'payload'
import { CODE_REGEX, ENTITY_SLUGS, PREFIX_TO_SLUG, UNK_TAG, extractCodes } from '../lib/codes'

async function resolveCode(req: PayloadRequest, code: string) {
  const slug = PREFIX_TO_SLUG[code[0]]
  if (!slug) return null
  const { docs } = await req.payload.find({
    collection: slug as never,
    where: { code: { equals: code } },
    limit: 1,
    depth: 1,
    req,
  })
  return docs[0] ? { code, collection: slug, doc: docs[0] } : null
}

// GET /api/codes/C10  ->  the entry with that ID, from whichever collection it lives in.
const lookup: Endpoint = {
  path: '/codes/:code',
  method: 'get',
  handler: async (req) => {
    const code = String(req.routeParams?.code ?? '').toUpperCase()
    if (!/^[A-Z]\d+$/.test(code)) return Response.json({ error: `"${code}" is not a valid ID` }, { status: 400 })
    const result = await resolveCode(req, code)
    if (!result) return Response.json({ error: `No entry found for ${code}` }, { status: 404 })
    return Response.json(result)
  },
}

// POST /api/codes/resolve  { "text": "C10 walked into L4 carrying I7" }
// Finds every ID in the text and returns the matching entries, plus any IDs that don't exist yet.
const resolve: Endpoint = {
  path: '/codes/resolve',
  method: 'post',
  handler: async (req) => {
    const body = (await req.json?.()) as { text?: string } | undefined
    const codes = extractCodes(body?.text ?? '')
    const results = await Promise.all(codes.map((c) => resolveCode(req, c)))
    return Response.json({
      found: results.filter(Boolean),
      unknown: codes.filter((_, i) => !results[i]),
    })
  },
}

// GET /api/codes/<ID>/links  ->  every relationship touching this entry, read from either side.
const links: Endpoint = {
  path: '/codes/:code/links',
  method: 'get',
  handler: async (req) => {
    const code = String(req.routeParams?.code ?? '').toUpperCase()
    const { docs } = await req.payload.find({
      collection: 'relationships',
      where: { or: [{ fromCode: { equals: code } }, { toCode: { equals: code } }] },
      limit: 500,
      depth: 0,
      req,
    })
    return Response.json({ code, links: docs })
  },
}

// GET /api/unk  ->  the review queue: every record tagged UNK, across all collections.
const unk: Endpoint = {
  path: '/unk',
  method: 'get',
  handler: async (req) => {
    const tag = await req.payload.find({ collection: 'tags', where: { name: { equals: UNK_TAG } }, limit: 1, depth: 0, req })
    const tagId = tag.docs[0]?.id
    if (!tagId) return Response.json({ total: 0, items: [] })
    const slugs = [...ENTITY_SLUGS, 'relationships'] as string[]
    const batches = await Promise.all(
      slugs.map(async (collection) => {
        const { docs } = await req.payload.find({
          collection: collection as never,
          where: { tags: { equals: tagId } },
          limit: 500,
          depth: 0,
          req,
        })
        return docs.map((d) => {
          const doc = d as { code?: string; name?: string; title?: string; reviewNote?: string }
          return { collection, code: doc.code, name: doc.name ?? doc.title, reviewNote: doc.reviewNote ?? '' }
        })
      }),
    )
    const items = batches.flat()
    return Response.json({ total: items.length, items })
  },
}

export const codeEndpoints: Endpoint[] = [lookup, resolve, links, unk]
export { CODE_REGEX }
