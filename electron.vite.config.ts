import { resolve, dirname, join } from 'path'
import { builtinModules, createRequire } from 'module'
import { cpSync } from 'fs'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Node.js built-in modules: both bare and node: prefixed
const builtins = builtinModules.flatMap((m) => [m, `node:${m}`])

/**
 * Rollup's _interopNamespaceDefault crashes when a CJS require() target
 * has inherited enumerable prototype properties (e.g. process inherits
 * from EventEmitter). for…in picks them up, but getOwnPropertyDescriptor
 * returns undefined. This plugin patches the helper to add a null guard.
 */
function patchInteropNamespace(): Plugin {
  return {
    name: 'patch-interop-namespace',
    renderChunk(code) {
      const buggy = 'const d = Object.getOwnPropertyDescriptor(e, k);\n        Object.defineProperty(n, k, d.get ? d'
      if (!code.includes(buggy)) return null
      return code.replace(
        buggy,
        'const d = Object.getOwnPropertyDescriptor(e, k);\n        if (!d) continue;\n        Object.defineProperty(n, k, d.get ? d'
      )
    }
  }
}

/**
 * Copy node-opcua-nodesets XML files to out/nodesets/ after build.
 * The bundled code resolves them via __dirname + "/../nodesets/".
 */
function copyOpcUaNodesets(): Plugin {
  return {
    name: 'copy-opcua-nodesets',
    closeBundle() {
      // Resolve via package entry — pnpm may not hoist the package to root node_modules
      const pkgDir = dirname(createRequire(import.meta.url).resolve('node-opcua-nodesets/package.json'))
      const src = join(pkgDir, 'nodesets')
      const dest = resolve('out/nodesets')
      cpSync(src, dest, { recursive: true })
    }
  }
}

export default defineConfig({
  main: {
    plugins: [copyOpcUaNodesets()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared'),
        // Stub optional native deps — resolved BEFORE Vite's built-in
        // optional-peer-dep handler which inserts throw-on-load code
        'bufferutil': resolve('src/main/stubs/empty.cjs'),
        'utf-8-validate': resolve('src/main/stubs/empty.cjs'),
        'serialport': resolve('src/main/stubs/empty.cjs'),
        '@serialport/bindings-cpp': resolve('src/main/stubs/empty.cjs'),
        '@serialport/bindings-interface': resolve('src/main/stubs/empty.cjs'),
      }
    },
    build: {
      // Bundle all JS deps into a single file — eliminates
      // pnpm symlink + asar node_modules resolution issues
      externalizeDeps: false,
      minify: false,
      sourcemap: true,
      rollupOptions: {
        external: [
          // Node.js built-ins must stay external to avoid Rollup's
          // _interopNamespaceDefault crash on inherited prototype props
          // (e.g. process inherits EventEmitter methods)
          ...builtins,
          // Native binary (.node) — must stay external
          'better-sqlite3',
          // Native optional deps are stubbed via resolve.alias → empty.cjs
        ],
        output: {
          // CJS avoids broken ESM shim injection in multiline strings.
          // .cjs extension required because package.json has "type": "module"
          format: 'cjs',
          entryFileNames: '[name].cjs',
          inlineDynamicImports: true
        },
        plugins: [patchInteropNamespace()]
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
