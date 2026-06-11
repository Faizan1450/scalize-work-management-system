import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Fail loudly if 5173 is taken — silent hop to 5174 breaks CORS
  },
})

