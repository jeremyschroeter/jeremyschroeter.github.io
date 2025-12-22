/**
 * <blog-appendix-ref> Component
 * Inline reference to an appendix item
 * Usage: <blog-appendix-ref key="proof-theorem-1"></blog-appendix-ref>
 *
 * Renders as "A1" with a link to the appendix item
 */

import BlogAppendixItem from './blog-appendix-item.js';

class BlogAppendixRef extends HTMLElement {
  connectedCallback() {
    const key = this.getAttribute('key');

    if (!key) {
      console.warn('blog-appendix-ref: missing "key" attribute');
      this.textContent = 'A?';
      return;
    }

    // Try to get item info, or wait for it
    BlogAppendixItem.registerPendingRef(key, (item) => {
      this.renderRef(item);
    });
  }

  renderRef(item) {
    const { number, id } = item;
    this.innerHTML = `<a class="blog-appendix-ref-link" href="#${id}">A${number}</a>`;
  }
}

customElements.define('blog-appendix-ref', BlogAppendixRef);

export default BlogAppendixRef;
