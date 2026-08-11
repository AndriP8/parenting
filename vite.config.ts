import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['parenting.andripurnomo.com'],
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'app',
    }),
    viteReact(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
