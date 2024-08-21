import { defineConfig, loadEnv } from 'vite'
import webExtension from '@samrum/vite-plugin-web-extension'
import manifest from './src/browser-extension/manifest.json'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from 'vite-plugin-svgr'

export default defineConfig(({ mode }) => {
    // 加载环境变量
    const env = loadEnv(mode, process.cwd(), '')

    const isDev = mode === 'development'

    return {
        plugins: [
            tsconfigPaths(),
            react(),
            svgr(),
            webExtension({
                manifest: manifest as chrome.runtime.Manifest,
            }),
        ],
        build: {
            assetsInlineLimit: 1024 * 1024, // 1mb
            minify: !isDev,
            sourcemap: isDev,
            target: 'chrome105',
            rollupOptions: {
                output: {
                    dir: 'dist/browser-extension/chromium',
                },
            },
        },
        define: {
            'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(env.VITE_CLERK_PUBLISHABLE_KEY),
            'import.meta.env.VITE_REACT_APP_GITHUB_TOKEN': JSON.stringify(env.VITE_REACT_APP_GITHUB_TOKEN),
        },
    }
})
