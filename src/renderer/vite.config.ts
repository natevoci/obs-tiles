import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
	plugins: [
		react({ include: '**/*.{ts,tsx,js,jsx}' }),
		tsconfigPaths(),
	],
	resolve: {
		alias: {
			'~': __dirname,
		},
	},
	esbuild: {
		loader: 'tsx',
		include: /.*\.tsx?$/,
		exclude: [],
	},
	optimizeDeps: {
		esbuildOptions: {
			loader: {
				'.ts': 'tsx',
				'.tsx': 'tsx',
				'.js': 'jsx',
				'.jsx': 'jsx',
			},
		},
	},
	server: {
		port: 3000,
		open: true,
	},
	build: {
		outDir: '../../dist',
		sourcemap: false,
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					let extType = assetInfo.name.split('.').at(1)
					if (/png|jpe?g|gif|svg|webp|woff|woff2|ttf|otf|eot/.test(extType)) {
						extType = 'assets'
					}
					return `${extType}/[name]-[hash][extname]`
				}
			}
		}
	},
})
