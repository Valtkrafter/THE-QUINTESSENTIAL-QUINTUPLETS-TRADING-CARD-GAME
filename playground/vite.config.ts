import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { writeAllDeclarations, writeDeclaration } from './tools/css-module-types.ts'

// Keeps the typed class-name files of the CSS Modules current while the dev server runs (see tools/css-module-types.ts).
const cssModuleTypes = {
  name: 'css-module-types',
  buildStart() {
    writeAllDeclarations('src')
  },
  handleHotUpdate({ file }: { file: string }) {
    if (file.endsWith('.module.css')) {
      writeDeclaration(file)
    }
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cssModuleTypes],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  server: {
    // Native file events were missed on this machine (stale modules after edits); polling is reliable.
    watch: { usePolling: true, interval: 200 },
  },
})
