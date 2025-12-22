/**
 * <blog-nav> Component
 * Renders the site navigation bar
 *
 * Usage: <blog-nav></blog-nav>
 */

class BlogNav extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="nav">
        <ul class="wrap">
          <li><a href="/">Home</a></li>
          <li><a href="/blog.html">Posts</a></li>
          <li><a href="/about.html">About</a></li>
        </ul>
      </div>
    `;
  }
}

customElements.define('blog-nav', BlogNav);

export default BlogNav;
