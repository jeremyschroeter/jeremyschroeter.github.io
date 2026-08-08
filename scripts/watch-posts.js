/**
 * Watch posts/ and regenerate assets/posts.json on changes.
 * Run with: node scripts/watch-posts.js
 */

import { watch } from 'fs';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.join(__dirname, '..', 'posts');
const generateScript = path.join(__dirname, 'generate-posts-json.js');

let timer = null;

function regenerate() {
  execFile(process.execPath, [generateScript], (err, stdout, stderr) => {
    if (err) console.error(stderr || err.message);
    else process.stdout.write(stdout);
  });
}

watch(postsDir, (eventType, filename) => {
  if (filename && !filename.endsWith('.html')) return;
  // debounce: editors fire multiple events per save
  clearTimeout(timer);
  timer = setTimeout(regenerate, 200);
});

console.log(`Watching ${postsDir} for changes...`);
