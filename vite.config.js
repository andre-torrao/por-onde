import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('parishes-final'))        return 'geodata-parishes'
          if (id.includes('municipalities-final'))  return 'geodata-municipalities'
          if (id.includes('leaflet'))               return 'leaflet'
        },
      },
    },
  },
})
