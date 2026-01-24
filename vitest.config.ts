import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    name: 'renderer',
    environment: 'jsdom',
    root: './tests/unit/renderer',
    include: ['**/*.test.{ts,tsx}'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage/renderer',
      include: ['src/renderer/**/*.{ts,tsx}'],
      exclude: ['src/renderer/main.tsx', 'src/renderer/components/ui/**']
    }
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})
