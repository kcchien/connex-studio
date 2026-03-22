import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      externalizeDeps: true,
      minify: false,
      sourcemap: true,
      rollupOptions: {
        external: ['better-sqlite3', 'node-opcua', 'node-opcua-client'],
        output: {
          preserveModules: true,
          preserveModulesRoot: 'src/main',
          entryFileNames: '[name].js'
        }
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    build: {
      externalizeDeps: true,
      rollupOptions: {
        output: {
          // Sandbox mode requires CJS; ESM (.mjs) causes "Cannot use import statement"
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
    // PostCSS is configured in postcss.config.js
  }
})
