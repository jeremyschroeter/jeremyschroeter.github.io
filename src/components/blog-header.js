/**
 * <blog-header> Component
 * Renders the post front-matter (title, subtitle, date)
 *
 * Usage:
 * <blog-header
 *   title="Post Title"
 *   subtitle="A description of the post"
 *   date="2025-06-17">
 * </blog-header>
 */

class BlogHeader extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  /**
   * Format date from YYYY-MM-DD to "17 June 2025"
   */
  formatDate(dateStr) {
    if (!dateStr) return '';

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const [year, month, day] = dateStr.split('-').map(Number);
    return `${day} ${months[month - 1]} ${year}`;
  }

  render() {
    const title = this.getAttribute('title') || '';
    const subtitle = this.getAttribute('subtitle') || '';
    const date = this.getAttribute('date') || '';

    this.innerHTML = `
      <div class="front-matter">
        <div class="wrap">
          <h1>${title}</h1>
          ${subtitle ? `<h4>${subtitle}</h4>` : ''}
          <div class="bylines">
            <div class="byline">
              <h3>Published</h3>
              <p>${this.formatDate(date)}</p>
            </div>
            <div class="clear"></div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('blog-header', BlogHeader);

export default BlogHeader;
