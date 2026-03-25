import { resolve } from 'path'
import { builtinModules } from 'module'
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
 * Stub out packages with native bindings that we don't actually use.
 * modbus-serial requires serialport for RS-485/RTU connections, but
 * we only use Modbus TCP (which uses Node.js net module, no native code).
 * Without this stub, Rollup hoists require("serialport") to top-level
 * and it fails at load time in the packaged app.
 */
function stubNativePackages(): Plugin {
  const stubs: Record<string, string> = {
    serialport: 'module.exports = {};',
    '@serialport/bindings-cpp': 'module.exports = {};',
    '@serialport/bindings-interface': 'module.exports = {};',
  }
  return {
    name: 'stub-native-packages',
    resolveId(id) {
      if (id in stubs) return `\0stub:${id}`
      return null
    },
    load(id) {
      if (id.startsWith('\0stub:')) return stubs[id.slice(6)]
      return null
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
      const src = resolve('node_modules/node-opcua-nodesets/nodesets')
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
        '@shared': resolve('src/shared')
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
          // serialport/bindings-cpp are stubbed by stubNativePackages plugin
        ],
        output: {
          // CJS avoids broken ESM shim injection in multiline strings.
          // .cjs extension required because package.json has "type": "module"
          format: 'cjs',
          entryFileNames: '[name].cjs',
          inlineDynamicImports: true
        },
        plugins: [stubNativePackages(), patchInteropNamespace()]
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
