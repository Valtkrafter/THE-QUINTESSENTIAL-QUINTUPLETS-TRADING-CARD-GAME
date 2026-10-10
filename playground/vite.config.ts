import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Native file events were missed on this machine (stale modules after edits); polling is reliable.
    watch: { usePolling: true, interval: 200 },
  },
})
