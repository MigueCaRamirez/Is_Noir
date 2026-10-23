import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El build local usa la raíz. Para GitHub Pages se puede definir
// VITE_BASE_PATH=/Is_Noir/ en el pipeline sin tocar el código.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
  },
})
