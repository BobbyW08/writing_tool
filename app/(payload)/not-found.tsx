import { NotFoundPage } from '@payloadcms/next/views'
import { importMap } from './admin/importMap.js'
import config from '@payload-config'

export default function NotFound() {
  return NotFoundPage({
    config,
    importMap,
    params: Promise.resolve({ segments: [] }),
    searchParams: Promise.resolve({}),
  })
}
