import { defineConfig } from 'vite';

async function optionalPlugins() {
  const plugins = [];
  try {
    const compression = (await import('vite-plugin-compression')).default;
    plugins.push(compression({ algorithm: 'gzip', ext: '.gz' }));
    plugins.push(compression({ algorithm: 'brotliCompress', ext: '.br' }));
  } catch {}
  try {
    const { visualizer } = await import('rollup-plugin-visualizer');
    plugins.push(visualizer({ filename: 'dist/bundle-report.html', gzipSize: true, brotliSize: true }));
  } catch {}
  try {
    const { VitePWA } = await import('vite-plugin-pwa');
    plugins.push(VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/*.webp'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 1024 * 1024
      }
    }));
  } catch {}
  return plugins;
}

export default defineConfig(async () => ({
  plugins: await optionalPlugins(),
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: 'assets/chunk-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
}));
