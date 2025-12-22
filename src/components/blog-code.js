/**
 * <blog-code> Component
 * Syntax-highlighted code blocks using PrismJS
 *
 * Usage:
 * <blog-code language="python">
 * def hello():
 *     print("Hello, world!")
 * </blog-code>
 *
 * Supported languages: python, javascript, bash, json, css, html
 */

import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

// Extend Python grammar to highlight method calls like .append(), .pdf()
Prism.languages.insertBefore('python', 'function', {
  'method': {
    pattern: /(?<=\.)\w+(?=\s*\()/,
    alias: 'function'
  }
});

class BlogCode extends HTMLElement {
  connectedCallback() {
    // Capture the original text content before modifying DOM
    if (!this._code) {
      this._code = this.textContent;
    }

    this.render();
  }

  render() {
    const code = this._code.trim();
    const language = this.getAttribute('language') || 'python';

    // Create pre > code structure
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.className = `language-${language}`;
    codeEl.textContent = code;

    pre.appendChild(codeEl);

    // Clear and append
    this.innerHTML = '';
    this.appendChild(pre);

    // Apply syntax highlighting
    try {
      Prism.highlightElement(codeEl);
    } catch (e) {
      console.warn('PrismJS highlighting failed:', e);
    }
  }
}

customElements.define('blog-code', BlogCode);

export default BlogCode;
