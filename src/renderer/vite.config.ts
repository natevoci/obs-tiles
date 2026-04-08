import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
	// Load .env.local from the project root (two levels up from src/renderer/)
	envDir: resolve(__dirname, '../..'),
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
		port: 5173
	},
	build: {
		outDir: '../../dist',
		sourcemap: false,
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					const names = assetInfo.names || [];
					const assetName = names.find(name => {
						const ext = name.split('.').pop() || "";
						return /png|jpe?g|gif|svg|webp|woff|woff2|ttf|otf|eot|css|js|json/.test(ext);
					}) || names.at(-1) || assetInfo.name || "";
					const extType = assetName.split('.').pop() || "";
					if (/png|jpe?g|gif|svg|webp|woff|woff2|ttf|otf|eot/.test(extType)) {
						return `assets/[name]-[hash][extname]`
					}
					return `${extType}/[name]-[hash][extname]`
				}
			}
		}
	},
})
