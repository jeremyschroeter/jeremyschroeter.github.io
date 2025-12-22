/**
 * <blog-footnote> Component
 * Defines a numbered footnote that can be referenced from the main text
 * Usage: <blog-footnote key="galvani">Content of the footnote...</blog-footnote>
 *
 * Footnotes are auto-numbered (1, 2, etc.) and referenced with <blog-fn-ref key="...">
 */

class BlogFootnote extends HTMLElement {
  static counter = 0;
  static itemMap = new Map(); // key -> { number, content, id, element }
  static pendingRefs = []; // Refs waiting for items to be registered

  connectedCallback() {
    const key = this.getAttribute('key');

    if (!key) {
      console.warn('blog-footnote: missing "key" attribute');
      return;
    }

    // Increment counter and register this item
    BlogFootnote.counter++;
    const number = BlogFootnote.counter;
    const id = `fn-${key}`;

    BlogFootnote.itemMap.set(key, {
      number,
      id,
      element: this
    });

    // Store for rendering
    this._key = key;
    this._number = number;
    this._id = id;

    // Mark as processed (actual rendering happens in blog-footnotes)
    this._registered = true;

    // Notify any pending refs
    BlogFootnote.notifyPendingRefs(key);
  }

  /**
   * Get item info by key
   */
  static getItem(key) {
    return BlogFootnote.itemMap.get(key);
  }

  /**
   * Register a pending ref to be notified when item is available
   */
  static registerPendingRef(key, callback) {
    // Check if already available
    if (BlogFootnote.itemMap.has(key)) {
      callback(BlogFootnote.itemMap.get(key));
      return;
    }
    // Otherwise queue it
    BlogFootnote.pendingRefs.push({ key, callback });
  }

  /**
   * Notify pending refs when an item becomes available
   */
  static notifyPendingRefs(key) {
    const item = BlogFootnote.itemMap.get(key);
    if (!item) return;

    BlogFootnote.pendingRefs = BlogFootnote.pendingRefs.filter(ref => {
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
    BlogFootnote.counter = 0;
    BlogFootnote.itemMap = new Map();
    BlogFootnote.pendingRefs = [];
  }
}

customElements.define('blog-footnote', BlogFootnote);

export default BlogFootnote;
