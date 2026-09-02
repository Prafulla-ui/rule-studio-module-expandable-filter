import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function figmaVersionedImports() {
  return {
    name: 'figma-versioned-imports',
    async resolveId(id, importer, options) {
      const match = id.match(/^(.+)@(\d+\.\d+\.\d+)$/)
      if (!match) return null
      const resolved = await this.resolve(match[1], importer, {
        ...options,
        skipSelf: true,
      })
      return resolved
    },
  }
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/rule-studio-module-expandable-filter/' : '/',
  server: {
    host: true,
    port: 3001,
    strictPort: true,
    open: '/',
  },
  preview: {
    host: '127.0.0.1',
    port: 3001,
    strictPort: true,
    open: true,
  },
  plugins: [
    figmaVersionedImports(),
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
    },
  },
}))
