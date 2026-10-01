import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The archive is a pure view over the public dataset. It has no data of its own:
 * every record it renders comes from ../data/ via ../dist/myanmar-hiphop.json.
 *
 * @archive/myanmar-hiphop.json therefore points outside this app's root, which
 * needs server.fs.allow to be widened. The file is regenerated from ../data/ by
 * the predata / predev / prebuild hooks in package.json, so it is never edited
 * by hand and never checked in here.
 */
const payload = fileURLToPath(new URL('../dist/myanmar-hiphop.json', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@archive': payload },
  },
  server: {
    fs: { allow: ['..'] },
  },
});
