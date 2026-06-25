import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Относительный base — собранная статика работает из любой подпапки демо-хостинга.
export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'jsdom',
  },
})
