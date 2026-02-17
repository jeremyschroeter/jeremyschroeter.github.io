/**
 * <blog-math> Component
 * Renders LaTeX math equations using KaTeX
 *
 * Usage:
 *   Inline: <blog-math>E = mc^2</blog-math>
 *   Block:  <blog-math block>\int_0^\infty e^{-x^2} dx</blog-math>
 */

import katex from 'katex';

class BlogMath extends HTMLElement {
  static get observedAttributes() {
    return ['block'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  render() {
    // Store original content if not already stored
    if (!this._originalContent) {
      this._originalContent = this.textContent.trim();
    }

    const latex = this._originalContent;
    const isBlock = this.hasAttribute('block');

    try {
      const html = katex.renderToString(latex, {
        displayMode: isBlock,
        throwOnError: false,
        trust: false,
        strict: 'warn',
        output: 'html',
        macros: {
          '\\bs': '\\boldsymbol',
          '\\R': '\\mathbb{R}',
          '\\E': '\\mathbb{E}',
          '\\Rn': '\\mathbb{R}^n'
        }
      });

      // Clear and set new content
      this.innerHTML = html;

      // Add class for styling
      if (isBlock) {
        this.classList.add('blog-math-block');
      } else {
        this.classList.add('blog-math-inline');
      }

      // Accessibility
      this.setAttribute('role', 'math');
      this.setAttribute('aria-label', latex);

    } catch (error) {
      console.error('KaTeX rendering error:', error);
      console.error('Failed LaTeX:', latex);
      this.innerHTML = `<span class="blog-math-error">${latex}</span>`;
    }
  }
}

customElements.define('blog-math', BlogMath);

export default BlogMath;
