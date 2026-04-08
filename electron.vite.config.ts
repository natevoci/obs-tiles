import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  main: {
    entry: 'src/main/index.ts',
    build: {
      outDir: path.resolve(__dirname, 'dist/main'),
    },
  },
  preload: {
    entry: 'src/preload/index.ts',
    build: {
      outDir: path.resolve(__dirname, 'dist/preload'),
      lib: {
        entry: 'src/preload/index.ts',
        formats: ['cjs'],
      },
      rollupOptions: {
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    // Load .env.local from the project root (absolute path required — relative paths
    // are resolved against the renderer root, not the config file location).
    envDir: __dirname,
    build: {
      outDir: path.resolve(__dirname, 'dist/renderer')
    },
    plugins: [react({ include: '**/*.{ts,tsx,js,jsx}' })],
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src/renderer'),
      },
    },
    esbuild: {
      loader: 'tsx',
      include: /src\/renderer\/.*\.tsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
  },
})
