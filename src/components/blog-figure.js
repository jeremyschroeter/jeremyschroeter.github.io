/**
 * <blog-figure> Component
 * Auto-numbered figures with captions
 *
 * Usage:
 * <blog-figure>
 *   <img src="path/to/image.png">
 *   <figcaption>Caption text here.</figcaption>
 * </blog-figure>
 *
 * Optional: Add class="outset" for wider figures
 */

class BlogFigure extends HTMLElement {
  static counter = 0;

  connectedCallback() {
    BlogFigure.counter++;
    this.number = BlogFigure.counter;
    this.setAttribute('role', 'figure');
    this.addFigureNumber();
  }

  addFigureNumber() {
    const caption = this.querySelector('figcaption');
    if (!caption) return;

    // Don't add if already numbered
    if (caption.querySelector('.blog-figure-number')) return;

    const numberSpan = document.createElement('span');
    numberSpan.className = 'blog-figure-number';
    numberSpan.textContent = `Figure ${this.number}. `;
    caption.insertBefore(numberSpan, caption.firstChild);
  }

  /**
   * Reset counter (useful for testing or SPA navigation)
   */
  static reset() {
    BlogFigure.counter = 0;
  }
}

customElements.define('blog-figure', BlogFigure);

export default BlogFigure;
