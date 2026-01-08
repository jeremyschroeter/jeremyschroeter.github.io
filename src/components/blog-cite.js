/**
 * <blog-cite> Component
 * Inline citations with BibTeX support and auto-generated bibliography
 *
 * Usage:
 * <blog-cite key="smith2020"></blog-cite>
 * <blog-cite key="smith2020,jones2021"></blog-cite>  (multiple citations)
 *
 * Bibliography can be loaded from:
 * 1. External .bib file: <link rel="bibliography" href="references.bib">
 * 2. Inline script tag: <script type="text/bibliography">...</script>
 */

import bibtexParse from 'bibtex-parse-js';

class BlogCite extends HTMLElement {
  static bibliography = null;
  static citationMap = new Map();
  static renderScheduled = false;
  static bibliographyLoading = null;
  static pendingCites = [];

  connectedCallback() {
    const keyAttr = this.getAttribute('key');
    if (!keyAttr) {
      console.warn('blog-cite: missing "key" attribute');
      this.textContent = '[?]';
      return;
    }

    // If bibliography is already loaded, render immediately
    if (BlogCite.bibliography) {
      this.renderCitation(keyAttr);
      return;
    }

    // If bibliography is loading, queue this citation
    if (BlogCite.bibliographyLoading) {
      BlogCite.pendingCites.push({ element: this, key: keyAttr });
      return;
    }

    // Start loading bibliography
    BlogCite.bibliographyLoading = this.loadBibliography().then(() => {
      // Render this citation
      this.renderCitation(keyAttr);

      // Render all pending citations
      BlogCite.pendingCites.forEach(({ element, key }) => {
        element.renderCitation(key);
      });
      BlogCite.pendingCites = [];
    });
  }

  /**
   * Load bibliography from external file or inline script
   */
  async loadBibliography() {
    // Try external .bib file first
    const bibLink = document.querySelector('link[rel="bibliography"]');
    if (bibLink) {
      const href = bibLink.getAttribute('href');
      if (href) {
        try {
          const response = await fetch(href);
          if (response.ok) {
            const bibtex = await response.text();
            this.parseBibtex(bibtex);
            return;
          }
        } catch (error) {
          console.error('blog-cite: Error loading bibliography file:', error);
        }
      }
    }

    // Fall back to inline script tag
    const scriptTag = document.querySelector('script[type="text/bibliography"]');
    if (scriptTag) {
      this.parseBibtex(scriptTag.textContent);
      return;
    }

    console.warn('blog-cite: No bibliography found. Use <link rel="bibliography" href="file.bib"> or <script type="text/bibliography">');
  }

  /**
   * Parse BibTeX string into bibliography map
   */
  parseBibtex(bibtex) {
    try {
      const entries = bibtexParse.toJSON(bibtex.trim());
      BlogCite.bibliography = new Map();
      entries.forEach(entry => {
        BlogCite.bibliography.set(entry.citationKey, entry.entryTags);
      });
    } catch (error) {
      console.error('blog-cite: BibTeX parsing error:', error);
    }
  }

  /**
   * Render the citation after bibliography is loaded
   */
  renderCitation(keyAttr) {
    // Support multiple comma-separated keys
    const keys = keyAttr.split(',').map(k => k.trim());
    const citations = [];

    for (const key of keys) {
      const entry = BlogCite.bibliography?.get(key);
      if (!entry) {
        console.warn(`blog-cite: citation not found for key "${key}"`);
        citations.push({ key, number: '?', entry: null });
        continue;
      }

      // Get or assign citation number
      if (!BlogCite.citationMap.has(key)) {
        BlogCite.citationMap.set(key, BlogCite.citationMap.size + 1);
      }
      const number = BlogCite.citationMap.get(key);
      citations.push({ key, number, entry });
    }

    // Render citation(s)
    if (citations.length === 1) {
      const { key, number } = citations[0];
      this.innerHTML = `<a class="blog-cite-link" href="#ref-${key}">[${number}]</a>`;
    } else {
      // Multiple citations: [1,2,3] format
      const links = citations.map(({ key, number }) =>
        `<a class="blog-cite-link" href="#ref-${key}">${number}</a>`
      ).join(',');
      this.innerHTML = `[${links}]`;
    }

    // Schedule rendering of bibliography section (debounced)
    if (!BlogCite.renderScheduled) {
      BlogCite.renderScheduled = true;
      setTimeout(() => {
        BlogCite.renderBibliographySection();
        BlogCite.renderScheduled = false;
      }, 200);
    }
  }

  /**
   * Render bibliography section at end of article
   */
  static renderBibliographySection() {
    if (!BlogCite.bibliography || BlogCite.citationMap.size === 0) return;

    // Find or create bibliography container
    let container = document.querySelector('.blog-bibliography');

    if (!container) {
      container = document.createElement('div');
      container.id = 'bibliography';
      container.className = 'blog-bibliography';

      // Find the article to append inside (at the end)
      const article = document.querySelector('.wrap.article') ||
                      document.querySelector('.article');

      if (article) {
        // Append inside the article
        article.appendChild(container);
      } else {
        // Fallback: append to content
        const content = document.querySelector('.content');
        if (content) content.appendChild(container);
      }
    }

    // Build bibliography HTML
    let html = '<h2 class="blog-bibliography-title">References</h2><ol class="bibliography">';

    // Get citations in order they were used
    const citationsInOrder = Array.from(BlogCite.citationMap.entries())
      .sort((a, b) => a[1] - b[1]);

    citationsInOrder.forEach(([key, number]) => {
      const entry = BlogCite.bibliography.get(key);
      if (!entry) return;

      html += `<li id="ref-${key}">`;
      html += BlogCite.formatBibEntry(entry);
      html += '</li>';
    });

    html += '</ol>';
    container.innerHTML = html;
  }

  /**
   * Format authors with "et al." for 3+ authors
   */
  static formatAuthors(authorString) {
    if (!authorString) return 'Unknown';

    // BibTeX uses "and" to separate authors
    const authors = authorString.split(/\s+and\s+/i).map(a => a.trim());

    if (authors.length <= 2) {
      // 1-2 authors: show all, join with " and "
      return authors.join(' and ');
    } else {
      // 3+ authors: first author + et al.
      return `${authors[0]} et al.`;
    }
  }

  /**
   * Format a bibliography entry
   */
  static formatBibEntry(entry) {
    const authors = BlogCite.formatAuthors(entry.author);
    const year = entry.year || 'n.d.';
    const title = entry.title || 'Untitled';
    const venue = entry.journal || entry.booktitle || entry.publisher || '';
    const volume = entry.volume;
    const number = entry.number;
    const pages = entry.pages;

    let html = `${authors} (${year}). <em>${title}</em>.`;

    if (venue) {
      html += ` ${venue}`;
      if (volume) {
        html += `, ${volume}`;
        if (number) html += `(${number})`;
      }
      if (pages) html += `, ${pages}`;
      html += '.';
    }

    return html;
  }

  /**
   * Reset state (useful for testing or SPA navigation)
   */
  static reset() {
    BlogCite.bibliography = null;
    BlogCite.citationMap = new Map();
    BlogCite.renderScheduled = false;
    BlogCite.bibliographyLoading = null;
    BlogCite.pendingCites = [];

    // Remove existing bibliography section
    const container = document.querySelector('.blog-bibliography');
    if (container) container.remove();
  }
}

customElements.define('blog-cite', BlogCite);

export default BlogCite;
