/**
 * <blog-appendix-item> Component
 * Defines a numbered appendix item that can be referenced from the main text
 * Usage: <blog-appendix-item key="proof-theorem-1" title="Proof of Theorem 1">...</blog-appendix-item>
 *
 * Items are auto-numbered (A.1, A.2, etc.) and can be referenced with <blog-appendix-ref>
 */

class BlogAppendixItem extends HTMLElement {
  static counter = 0;
  static itemMap = new Map(); // key -> { number, title, element }
  static pendingRefs = []; // Refs waiting for items to be registered

  connectedCallback() {
    const key = this.getAttribute('key');
    const title = this.getAttribute('title') || 'Untitled';

    if (!key) {
      console.warn('blog-appendix-item: missing "key" attribute');
      return;
    }

    // Increment counter and register this item
    BlogAppendixItem.counter++;
    const number = BlogAppendixItem.counter;
    const id = `appendix-${key}`;

    BlogAppendixItem.itemMap.set(key, {
      number,
      title,
      id,
      element: this
    });

    // Store for rendering
    this._key = key;
    this._number = number;
    this._title = title;
    this._id = id;
    this._content = this.innerHTML;

    // Mark as processed (actual rendering happens in blog-appendix)
    this._registered = true;

    // Notify any pending refs
    BlogAppendixItem.notifyPendingRefs(key);
  }

  /**
   * Get item info by key
   */
  static getItem(key) {
    return BlogAppendixItem.itemMap.get(key);
  }

  /**
   * Register a pending ref to be notified when item is available
   */
  static registerPendingRef(key, callback) {
    // Check if already available
    if (BlogAppendixItem.itemMap.has(key)) {
      callback(BlogAppendixItem.itemMap.get(key));
      return;
    }
    // Otherwise queue it
    BlogAppendixItem.pendingRefs.push({ key, callback });
  }

  /**
   * Notify pending refs when an item becomes available
   */
  static notifyPendingRefs(key) {
    const item = BlogAppendixItem.itemMap.get(key);
    if (!item) return;

    BlogAppendixItem.pendingRefs = BlogAppendixItem.pendingRefs.filter(ref => {
      if (ref.key === key) {
        ref.callback(item);
        return false; // Remove from pending
      }
      return true; // Keep in pending
    });
  }

  /**
   * Reset static state
   */
  static reset() {
    BlogAppendixItem.counter = 0;
    BlogAppendixItem.itemMap = new Map();
    BlogAppendixItem.pendingRefs = [];
  }
}

customElements.define('blog-appendix-item', BlogAppendixItem);

export default BlogAppendixItem;
