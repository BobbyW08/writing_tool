// Single source of truth for "what read page does this code link to." Most collections are
// `/${collection}/${code}`; a few have no read page of their own and point elsewhere instead.
// Used by every view that turns a Node into a link (code-text, what-links-here, node map,
// relationship view) so they never drift from each other.

const COLLECTION_HREF: Record<string, (code: string) => string> = {
  events: (code) => `/events/${code}`,
  stories: (code) => `/stories/${code}`,
  writing: (code) => `/write/${code}`,
  eras: (code) => `/timeline?era=${code}`, // eras have no read page; they live on the timeline
  maps: (code) => `/maps/${code}`,
  'map-pins': (code) => `/pins/${code}`, // pins have no read page of their own; redirects into their map
}

export function hrefForNode(collection: string, code: string): string {
  return COLLECTION_HREF[collection]?.(code) ?? `/${collection}/${code}`
}
