/**
 * <blog-fn-ref> Component
 * Inline reference to a footnote
 * Usage: Text with a footnote<blog-fn-ref key="galvani"></blog-fn-ref> continues here.
 *
 * Renders as superscript number with a link to the footnote
 */

import BlogFootnote from './blog-footnote.js';

class BlogFnRef extends HTMLElement {
  connectedCallback() {
    const key = this.getAttribute('key');

    if (!key) {
      console.warn('blog-fn-ref: missing "key" attribute');
      this.innerHTML = '<sup>?</sup>';
      return;
    }

    // Try to get item info, or wait for it
    BlogFootnote.registerPendingRef(key, (item) => {
      this.renderRef(item);
    });
  }

  renderRef(item) {
    const { number, id } = item;
    this.innerHTML = `<sup class="blog-fn-ref-marker"><a href="#${id}" id="fnref-${id}">${number}</a></sup>`;
  }
}

customElements.define('blog-fn-ref', BlogFnRef);

export default BlogFnRef;
