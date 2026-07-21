import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load VW_* secrets from .env.local (gitignored) — never bundled into the client.
  const env = loadEnv(mode, __dirname, ['VW_'])
  const base = env.VW_API_BASE || 'https://apps.visionwaves.com'
  // Fixed headers every VisionWaves catalog call needs (from the provided curls).
  const vwHeaders: Record<string, string> = {
    audience: env.VW_AUDIENCE || 'apim',
    'client-code': env.VW_CLIENT_CODE || '',
    customerid: env.VW_CUSTOMER_ID || '1',
    userid: env.VW_USER_ID || '',
    'x-module': env.VW_X_MODULE || 'DBDATACATALOG_APP_NAME',
    'x-submodule': env.VW_X_SUBMODULE || 'DBDATACATALOG_APP_NAME.ASSET',
  }
  if (env.VW_TOKEN) vwHeaders.authorization = `Bearer ${env.VW_TOKEN.trim().replace(/^Bearer\s+/i, '')}`

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/app'),
      },
    },
    server: {
      proxy: {
        // App calls /vwapi/... same-origin; proxy forwards to the catalog API with auth injected.
        '/vwapi': {
          target: base,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/vwapi/, '/apim/dbdatacatalog/1.0/rest'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              for (const [k, v] of Object.entries(vwHeaders)) if (v) proxyReq.setHeader(k, v)
            })
          },
        },
      },
    },
  }
})
