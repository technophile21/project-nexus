import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Terminal from 'vite-plugin-terminal'

export default defineConfig({
  plugins: [react(), Terminal()],
  server: {
    host: '127.0.0.1',
  },
})
