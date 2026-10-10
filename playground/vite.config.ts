import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  server: {
    // Native file events were missed on this machine (stale modules after edits); polling is reliable.
    watch: { usePolling: true, interval: 200 },
  },
})
