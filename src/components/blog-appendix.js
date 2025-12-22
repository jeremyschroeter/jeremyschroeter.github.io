/**
 * <blog-appendix> Component
 * Container for numbered appendix items that can be referenced from the main text
 *
 * Usage:
 * <blog-appendix>
 *   <blog-appendix-item key="proof-1" title="Proof of Theorem 1">...</blog-appendix-item>
 *   <blog-appendix-item key="derivation" title="Derivation">...</blog-appendix-item>
 * </blog-appendix>
 *
 * Items are auto-numbered (A.1, A.2, etc.) and can be referenced with <blog-appendix-ref key="...">
 */

import BlogAppendixItem from './blog-appendix-item.js';

class BlogAppendix extends HTMLElement {
  connectedCallback() {
    if (!this._parsed) {
      this._parsed = true;
      // Defer rendering to allow child components to register
      setTimeout(() => this.render(), 0);
    }
  }

  render() {
    // Find all appendix items
    const items = Array.from(this.querySelectorAll('blog-appendix-item'));

    if (items.length === 0) {
      this.style.display = 'none';
      return;
    }

    // Build the appendix section
    const sectionEl = document.createElement('div');
    sectionEl.className = 'blog-appendix-section';

    // Create header
    const title = document.createElement('h2');
    title.className = 'blog-appendix-title';
    title.textContent = 'Appendix';
    sectionEl.appendChild(title);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'blog-appendix-items';

    items.forEach((item, index) => {
      const key = item.getAttribute('key');
      const itemTitle = item.getAttribute('title') || 'Untitled';
      const number = index + 1;
      const id = `appendix-${key}`;

      // Register in the static map for refs to find
      BlogAppendixItem.itemMap.set(key, {
        number,
        title: itemTitle,
        id,
        element: item
      });

      // Notify any pending refs
      BlogAppendixItem.notifyPendingRefs(key);

      // Create the rendered item by cloning content (preserves blog-math elements)
      const itemEl = document.createElement('div');
      itemEl.id = id;
      itemEl.className = 'blog-appendix-item-rendered';

      const itemTitleEl = document.createElement('h3');
      itemTitleEl.className = 'blog-appendix-item-title';
      itemTitleEl.textContent = `A${number}: ${itemTitle}`;
      itemEl.appendChild(itemTitleEl);

      const contentEl = document.createElement('div');
      contentEl.className = 'blog-appendix-item-content';

      // Clone all child nodes to preserve blog-math elements
      while (item.firstChild) {
        contentEl.appendChild(item.firstChild);
      }

      itemEl.appendChild(contentEl);
      itemsContainer.appendChild(itemEl);
    });

    sectionEl.appendChild(itemsContainer);

    // Clear original content and append rendered section
    this.innerHTML = '';
    this.appendChild(sectionEl);
  }
}

customElements.define('blog-appendix', BlogAppendix);

export default BlogAppendix;
