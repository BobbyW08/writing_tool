// No types ship with this package (see package.json, no .d.ts anywhere in it) and there is no
// @types/i-storyline-js. Minimal shim for the subset lib/convergence/ actually calls — see
// node_modules/i-storyline-js/src/js/index.js and data/graph.js for the full real API.
declare module 'i-storyline-js' {
  interface IStorylineGraph {
    characters: string[]
    storylines: [number, number][][]
    storylinePaths: string[][]
  }

  export default class iStoryline {
    constructor(pipeline?: string[])
    load(fileUrl: string, fileType?: string): Promise<IStorylineGraph>
    loadJSON(json: unknown): Promise<IStorylineGraph>
    scale(x0?: number, y0?: number, width?: number, height?: number, reserveRatio?: boolean): IStorylineGraph
  }
}
