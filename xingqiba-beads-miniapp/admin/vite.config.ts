import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@cloudbase/') || id.includes('/node_modules/@firebase/')) return 'cloudbase'
          if (id.includes('/node_modules/@vue/') || id.includes('/node_modules/vue/')) return 'vue'
          if (id.includes('/node_modules/lucide-vue-next/')) return 'icons'
        },
      },
    },
  },
})
