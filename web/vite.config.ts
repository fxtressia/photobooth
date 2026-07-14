import { defineConfig, esmExternalRequirePlugin, type ConfigEnv } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
//import cloudflareAdapter from '@hono/vite-dev-server/cloudflare'
import path from "path"
//import devServer from '@hono/vite-dev-server'
export default defineConfig(({ isSsrBuild }: ConfigEnv) => {
  return {
    server: {
    allowedHosts: [
        'photobooth-project.tailf2950e.ts.net' 
        // Replace with your exact Funnel domain
    ]
  },
    assetsInclude: [path.resolve(__dirname, "./src/assets/**/*"), "./index.html"],
    plugins: [react(), cloudflare({
      viteEnvironment: { name: "ssr" }
    }), esmExternalRequirePlugin({
      // Specify the exact external libraries throwing the "require" error
      external: ['punycode/', 'punycode', 'fabric', 'url', 'canvas'],

      // Skip duplicate check against top-level config to prevent Vite warnings
      skipDuplicateCheck: true,
    }),],
    build: {
      sourcemap: true, // Ensure source maps are generated
    },
    css: {
      devSourcemap: true // If it's happening inside a CSS-in-JS library
    },
    resolve: {
      alias: (isSsrBuild ? {
        'punycode/': path.resolve(__dirname, './src', 'stub.ts'),
        'fabric': path.resolve(__dirname, './src', 'stub.ts'),
        'punycode': path.resolve(__dirname, './src', 'stub.ts'),
        '~': path.resolve(__dirname, './src'),
        
      } : {

        '~': path.resolve(__dirname, './src'),

      }),
      publicDir: "public",

      optimizeDeps: {
        exclude: ['linked-dep',  '@layerhub-io/react',  '@layerhub-io/core'],
        include: ['baseui', 'punycode', 'url', 'fabric',],
      },
    }
  };
});