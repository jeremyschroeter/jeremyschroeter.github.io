/**
 * Blog Components - Main Entry Point
 * Web components for static blog posts
 */

// Import components
import './components/blog-nav.js';
import './components/blog-header.js';
import './components/blog-figure.js';
import './components/blog-code.js';
import './components/blog-footnote.js';
import './components/blog-fn-ref.js';
import './components/blog-footnotes.js';
import './components/blog-cite.js';
import './components/blog-math.js';
import './components/blog-appendix-item.js';
import './components/blog-appendix-ref.js';
import './components/blog-appendix.js';
import './components/blog-post-list.js';

// Import styles
import './styles/base.css';
import './styles/blog-figure.css';
import './styles/blog-code.css';
import './styles/blog-fn.css';
import './styles/blog-cite.css';
import './styles/blog-math.css';
import './styles/blog-appendix.css';
import './styles/blog-post-list.css';

const VERSION = '1.0.0';

/**
 * Blog Components Controller
 */
class BlogComponents {
  constructor() {
    this.version = VERSION;
  }

  /**
   * Initialize the framework
   */
  init() {
    console.log(`Blog Components v${this.version} ready`);

    // Load KaTeX CSS if not already present
    this.loadKatexCSS();

    // Dispatch ready event
    document.dispatchEvent(new CustomEvent('blog-components-ready', {
      detail: { version: this.version }
    }));
  }

  /**
   * Load KaTeX CSS from CDN (if not already loaded)
   */
  loadKatexCSS() {
    if (document.querySelector('link[href*="katex"]')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
}

// Create global instance
const blogComponents = new BlogComponents();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => blogComponents.init());
} else {
  blogComponents.init();
}

// Expose globally
window.BlogComponents = blogComponents;

export default blogComponents;
export { VERSION };
