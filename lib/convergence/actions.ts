'use server'

import iStoryline from 'i-storyline-js'
import { getEventsForConvergence } from '@/lib/world/queries'
import { buildConvergenceStory, type ConvergencePoint } from './build'

export interface ConvergenceGraphResult {
  error?: string
  characters?: string[]
  // One SVG path `d` string per character, same order as `characters`.
  paths?: string[]
  points?: ConvergencePoint[]
  width?: number
  height?: number
}

// Runs entirely on the server: i-storyline-js's render pipeline is pure computation (no DOM),
// and keeping it server-side means the client never downloads the library at all — it only
// gets back plain SVG path strings.
export async function getConvergenceGraphAction(selectedCodes: string[]): Promise<ConvergenceGraphResult> {
  if (selectedCodes.length < 2) return { error: 'Pick at least two entries to see where their paths cross.' }

  const events = await getEventsForConvergence()
  const built = buildConvergenceStory(selectedCodes, events)
  if (!built) return { error: 'No event yet has two or more of these selected together. Add one to `involves` on a shared event first.' }

  try {
    const generator = new iStoryline()
    await generator.loadJSON(built.storyJSON)
    const width = 1000
    const height = Math.max(160, selectedCodes.length * 70)
    const graph = generator.scale(0, 0, width, height, false)
    return {
      characters: graph.characters as string[],
      paths: (graph.storylinePaths as string[][]).map((segments) => segments.join(' ')),
      points: built.points,
      width,
      height,
    }
  } catch (err) {
    return { error: `Layout failed: ${String(err)}` }
  }
}
