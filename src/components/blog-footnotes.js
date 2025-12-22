/**
 * <blog-footnotes> Component
 * Container for numbered footnotes that can be referenced from the main text
 *
 * Usage:
 * <blog-footnotes>
 *   <blog-footnote key="galvani">Some might say that Luigi Galvani...</blog-footnote>
 *   <blog-footnote key="neurons">I got the 1% figure from...</blog-footnote>
 * </blog-footnotes>
 *
 * Footnotes are auto-numbered (1, 2, etc.) and can be referenced with <blog-fn-ref key="...">
 */

import BlogFootnote from './blog-footnote.js';

class BlogFootnotes extends HTMLElement {
  connectedCallback() {
    if (!this._parsed) {
      this._parsed = true;
      // Defer rendering to allow child components to register
      setTimeout(() => this.render(), 0);
    }
  }

  render() {
    // Find all footnote items
    const items = Array.from(this.querySelectorAll('blog-footnote'));

    if (items.length === 0) {
      this.style.display = 'none';
      return;
    }

    // Build the footnotes section
    const sectionEl = document.createElement('div');
    sectionEl.className = 'blog-footnotes-section';

    // Create header
    const title = document.createElement('h2');
    title.className = 'blog-footnotes-title';
    title.textContent = 'Footnotes';
    sectionEl.appendChild(title);

    const listEl = document.createElement('ol');
    listEl.className = 'blog-footnotes-list';

    items.forEach((item, index) => {
      const key = item.getAttribute('key');
      const number = index + 1;
      const id = `fn-${key}`;

      // Register in the static map for refs to find
      BlogFootnote.itemMap.set(key, {
        number,
        id,
        element: item
      });

      // Notify any pending refs
      BlogFootnote.notifyPendingRefs(key);

      // Create the rendered item
      const itemEl = document.createElement('li');
      itemEl.id = id;
      itemEl.className = 'blog-footnote-item';

      // Clone all child nodes to preserve any nested elements
      const contentSpan = document.createElement('span');
      contentSpan.className = 'blog-footnote-content';
      while (item.firstChild) {
        contentSpan.appendChild(item.firstChild);
      }
      itemEl.appendChild(contentSpan);

      // Add back link
      const backLink = document.createElement('a');
      backLink.href = `#fnref-${id}`;
      backLink.className = 'blog-footnote-backlink';
      backLink.textContent = '↩';
      itemEl.appendChild(backLink);

      listEl.appendChild(itemEl);
    });

    sectionEl.appendChild(listEl);

    // Clear original content and append rendered section
    this.innerHTML = '';
    this.appendChild(sectionEl);
  }
}

customElements.define('blog-footnotes', BlogFootnotes);

export default BlogFootnotes;
