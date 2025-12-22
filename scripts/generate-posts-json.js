/**
 * Generate posts.json from blog-header attributes in HTML files
 * Run with: node scripts/generate-posts-json.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.join(__dirname, '..', 'posts');
const outputPath = path.join(__dirname, '..', 'assets', 'posts.json');

function extractMetadata(htmlContent, filename) {
  // Check if blog-header exists
  if (!htmlContent.includes('<blog-header')) {
    console.warn(`No blog-header found in ${filename}`);
    return null;
  }

  // Extract each attribute directly - handles values containing HTML tags
  const titleMatch = htmlContent.match(/title="([^"]+)"/);
  const subtitleMatch = htmlContent.match(/subtitle="([^"]+)"/);
  const dateMatch = htmlContent.match(/date="([^"]+)"/);

  return {
    url: `/posts/${filename}`,
    title: titleMatch ? titleMatch[1] : '',
    subtitle: subtitleMatch ? subtitleMatch[1] : '',
    date: dateMatch ? dateMatch[1] : ''
  };
}

// Get all HTML files in posts directory
const files = fs.readdirSync(postsDir)
  .filter(f => f.endsWith('.html'));

const posts = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
  const metadata = extractMetadata(content, file);
  if (metadata && metadata.date) {
    posts.push(metadata);
  }
}

// Sort by date descending (newest first)
posts.sort((a, b) => b.date.localeCompare(a.date));

fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2));
console.log(`Generated ${outputPath} with ${posts.length} posts`);
