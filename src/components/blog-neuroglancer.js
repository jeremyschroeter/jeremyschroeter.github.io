/**
 * <blog-neuroglancer> Component
 * A click-to-load Neuroglancer embed.
 *
 * Neuroglancer streams EM volumes and multi-megabyte meshes over WebGL, so it
 * is far too heavy to auto-load in an article. This renders a lightweight poster
 * and only injects the iframe when the reader asks for it (the same pattern as a
 * lazy YouTube embed). Until then the page pays nothing.
 *
 * The viewer state is given as an inline JSON blob — the same object a
 * Neuroglancer "#!" link encodes — so the scene (layers, segments, camera) stays
 * readable and editable rather than a base64 wall:
 *
 * <blog-neuroglancer viewer="https://ngl.cave-explorer.org/" height="480"
 *     caption="Four ExR1 ring neurons in the ellipsoid body.">
 *   <script type="application/json">
 *   { "layers": [ ... ], "layout": { "type": "3d" }, ... }
 *   </script>
 * </blog-neuroglancer>
 *
 * Add the `autoload` attribute to skip the click: the viewer then mounts by
 * itself the first time the figure scrolls near the viewport, so a reader who
 * never reaches it still never triggers the download.
 */

const DEFAULT_VIEWER = 'https://ngl.cave-explorer.org/';

class BlogNeuroglancer extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;

    this.viewer = this.getAttribute('viewer') || DEFAULT_VIEWER;
    this.height = this.getAttribute('height') || '480';
    this.caption = this.getAttribute('caption') || '';

    const state = this.readState();
    if (!state) {
      this.innerHTML = `<div class="ng"><p class="ng-error">No Neuroglancer state provided.</p></div>`;
      return;
    }

    this.url = this.viewer.replace(/\/+$/, '') + '/#!' + encodeURIComponent(JSON.stringify(state));
    this.segments = countSegments(state);
    this.renderPoster();

    if (this.hasAttribute('autoload')) this.armAutoload();
  }

  /**
   * Mount the viewer once the figure nears the viewport, so `autoload` costs
   * nothing until a reader actually scrolls to it. A manual Collapse cancels
   * this — the observer is one-shot — so the poster then stays put.
   */
  armAutoload() {
    if (!('IntersectionObserver' in window)) {
      this.embed();
      return;
    }
    this._observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) this.embed();
      },
      { rootMargin: '250px' }
    );
    this._observer.observe(this);
  }

  /** The scene lives in an inline <script type="application/json"> child. */
  readState() {
    const script = this.querySelector('script[type="application/json"]');
    if (!script) return null;
    try {
      return JSON.parse(script.textContent);
    } catch (err) {
      console.error('<blog-neuroglancer> could not parse state JSON:', err);
      return null;
    }
  }

  disconnectedCallback() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  renderPoster() {
    this.innerHTML = `
      <div class="ng" style="--ng-height:${Number(this.height)}px">
        <div class="ng-poster">
          <div class="ng-poster-body">
            <svg class="ng-glyph" viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="24" cy="9"  r="3.2" fill="currentColor"/>
              <circle cx="37" cy="16.5" r="3.2" fill="currentColor"/>
              <circle cx="37" cy="31.5" r="3.2" fill="currentColor"/>
              <circle cx="24" cy="39" r="3.2" fill="currentColor"/>
              <circle cx="11" cy="31.5" r="3.2" fill="currentColor"/>
              <circle cx="11" cy="16.5" r="3.2" fill="currentColor"/>
            </svg>
            <p class="ng-title">Interactive 3D connectome</p>
            <p class="ng-sub">${this.segments} neuron${this.segments === 1 ? '' : 's'} reconstructed from FlyWire electron-microscopy data. Drag to rotate, scroll to zoom.</p>
            <button type="button" class="ng-load">Load 3D viewer</button>
            <p class="ng-note">Loads Neuroglancer and streams EM meshes from FlyWire &mdash;
              <a class="ng-newtab" href="${escapeAttr(this.url)}" target="_blank" rel="noopener">open in a new tab</a> instead.</p>
          </div>
        </div>
      </div>
    `;
    this.querySelector('.ng-load').addEventListener('click', () => this.embed());
  }

  embed() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }

    const frame = document.createElement('iframe');
    frame.className = 'ng-frame';
    frame.src = this.url;
    frame.loading = 'lazy';
    frame.allow = 'fullscreen';
    frame.setAttribute('title', this.caption || 'Neuroglancer 3D viewer');

    const wrap = this.querySelector('.ng');
    wrap.innerHTML = '';
    wrap.appendChild(frame);

    // Offer an escape hatch: the viewer captures scroll/drag, so give the reader
    // a way to open it full-size and to collapse it back to the poster.
    const bar = document.createElement('div');
    bar.className = 'ng-bar';
    bar.innerHTML = `
      <a href="${escapeAttr(this.url)}" target="_blank" rel="noopener">Open full viewer &nearr;</a>
      <button type="button" class="ng-close">Collapse</button>
    `;
    wrap.appendChild(bar);
    bar.querySelector('.ng-close').addEventListener('click', () => this.renderPoster());
  }
}

function countSegments(state) {
  let n = 0;
  for (const layer of state.layers || []) {
    if (layer.type === 'segmentation' && Array.isArray(layer.segments)) {
      // The whole-brain neuropil mesh ("1") is scenery, not a neuron.
      n += layer.segments.filter((s) => s !== '1' && !String(s).startsWith('!')).length;
    }
  }
  return n;
}

const escapeAttr = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

customElements.define('blog-neuroglancer', BlogNeuroglancer);

export default BlogNeuroglancer;
