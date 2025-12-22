/**
 * <blog-post-list> Component
 * Automatically renders a list of blog posts from posts.json
 *
 * Usage: <blog-post-list src="/assets/posts.json"></blog-post-list>
 */

class BlogPostList extends HTMLElement {
  connectedCallback() {
    this.loadPosts();
  }

  /**
   * Format date from YYYY-MM-DD to "21 December 2025"
   */
  formatDate(dateStr) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const [year, month, day] = dateStr.split('-').map(Number);
    return `${day} ${months[month - 1]} ${year}`;
  }

  async loadPosts() {
    const src = this.getAttribute('src') || '/assets/posts.json';

    try {
      const response = await fetch(src);
      const posts = await response.json();

      // Sort by date (newest first)
      posts.sort((a, b) => new Date(b.date) - new Date(a.date));

      this.render(posts);
    } catch (error) {
      console.error('Failed to load posts:', error);
      this.innerHTML = '<p>Failed to load posts.</p>';
    }
  }

  render(posts) {
    this.innerHTML = posts.map(post => `
      <div class="blog-post-item">
        <p class="post-title">
          <a href="${post.url}">${post.title}</a>
        </p>
        <p class="post-date">${this.formatDate(post.date)}</p>
        <p class="post-subtitle">${post.subtitle}</p>
      </div>
    `).join('');

    // Render any math in titles/subtitles
    this.renderMath();
  }

  renderMath() {
    // Convert $...$ patterns to <blog-math> elements
    const elements = this.querySelectorAll('.post-title, .post-subtitle');
    elements.forEach(el => {
      el.innerHTML = el.innerHTML.replace(/\$([^$]+)\$/g, (match, tex) => {
        return `<blog-math>${tex}</blog-math>`;
      });
    });
  }
}

customElements.define('blog-post-list', BlogPostList);

export default BlogPostList;
