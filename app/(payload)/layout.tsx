import '@payloadcms/next/css'
import type React from 'react'
import { RootLayout } from '@payloadcms/next/layouts'
import { handleServerFunctions } from '@payloadcms/next/layouts'
import config from '@payload-config'
import { importMap } from './admin/importMap.js'

type Args = {
  children: React.ReactNode
}

const Layout = ({ children }: Args) =>
  RootLayout({
    children,
    config,
    importMap,
    serverFunction: async (args) => {
      'use server'
      return handleServerFunctions({ ...args, config, importMap })
    },
  })

export default Layout
