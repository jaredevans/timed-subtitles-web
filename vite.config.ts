import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// blob:/wasm-unsafe-eval are required by ffmpeg.wasm (core is loaded via blob
// URLs, see src/lib/mp4.ts); connect-src 'self' blocks the vendored worker's
// dormant unpkg.com fallback ever activating. Build-only: the dev server needs
// inline scripts for fast refresh.
const CSP = [
  "default-src 'self'",
  "script-src 'self' blob: 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

function injectCsp(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
            injectTo: 'head-prepend',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  base: '/timed-subtitles/',
  plugins: [react(), injectCsp()],
});
