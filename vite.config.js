import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	plugins: [react({ include: '**/*.{js,jsx}' })],
	resolve: {
		alias: {
			'~': path.resolve(__dirname, './src'),
		},
	},
	esbuild: {
		loader: 'jsx',
		include: /src\/.*\.js$/,
		exclude: [],
	},
	optimizeDeps: {
		esbuildOptions: {
			loader: {
				'.js': 'jsx',
			},
		},
	},
	server: {
		port: 3000,
		open: true,
		appType: 'spa',
	},
	build: {
		outDir: 'dist',
		sourcemap: false,
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					let extType = assetInfo.name.split('.').at(1);
					if (/png|jpe?g|gif|svg|webp|woff|woff2|ttf|otf|eot/.test(extType)) {
						extType = 'assets';
					}
					return `${extType}/[name]-[hash][extname]`;
				}
			}
		}
	},
});
