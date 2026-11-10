/** @type {import('next').NextConfig} */
const nextConfig = {
  // /login lives outside the (app) route group so it can have its own root layout
  // (no nav shell, nothing authenticated yet). Next 16's strict route matching flags
  // it anyway: route groups are stripped before the parallel-route-slot completeness
  // check runs, so /login gets swept into (app)/layout.tsx's @modal slot requirement
  // even though it has its own, unrelated root layout. @modal/default.tsx exists and
  // every other top-level route satisfies it fine -- this is Next's own documented
  // escape hatch for that specific false positive, not a real gap in our route tree.
  deprecated: {
    looseRouteMatching: true,
  },
}

export default nextConfig
