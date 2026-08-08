/**
 * <blog-hopfield> Component
 * A continuous Hopfield network (Hopfield 1984) storing 64x64 images.
 *
 * Corrupt the state and the network's dynamics flow downhill in energy until
 * they settle into the nearest stored memory. Memory is an attractor, not a
 * lookup: the computation *is* the relaxation.
 *
 *   tau du/dt = -u + W V        V = tanh(u / u0)
 *
 * With N = 4096 neurons the weight matrix W would hold 16.7M entries. It is
 * never built. Both learning rules are low rank in the P stored patterns, so
 * W V costs O(N P) instead of O(N^2):
 *
 *   Hebbian      W = (1/N) (X X^T - P I)      W V = X m / N - (P/N) V
 *   Projection   W = X (X^T X)^-1 X^T         W V = X (G^-1 m)
 *
 * where X is N x P and m = X^T V. Hebbian is the default: it is the rule the
 * essay motivates, and it recalls the stored patterns exactly so long as they
 * stay close to orthogonal (see scripts/generate-hopfield-patterns.py). The
 * projection rule tolerates correlated memories and is available via rule=".
 *
 * Usage:
 * <blog-hopfield src="/assets/hopfield-patterns.json"></blog-hopfield>
 */

const DT = 0.1;
const SETTLE_TOL = 2e-4;
const TRACE_LEN = 320;
const BRUSH = 1; // radius in cells, so a 3x3 nib

class BlogHopfield extends HTMLElement {
  connectedCallback() {
    this.rule = this.getAttribute('rule') || 'hebbian';
    this.u0 = Number(this.getAttribute('gain')) || 0.12;
    this.src = this.getAttribute('src') || '/assets/hopfield-patterns.json';

    this.renderShell();
    this.load();
  }

  disconnectedCallback() {
    this.pause();
  }

  async load() {
    try {
      const res = await fetch(this.src);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      this.ingest(await res.json());
    } catch (err) {
      console.error('<blog-hopfield> could not load patterns:', err);
      this.querySelector('.hp').innerHTML =
        `<p class="hp-error">Could not load memories from <code>${this.src}</code>.</p>`;
      return;
    }

    this.buildUI();
    this.loadMemory(0);
    this.corrupt();
  }

  /* ----------------------------------------------------------------- setup */

  ingest(data) {
    this.size = data.size;
    this.N = this.size * this.size;
    this.names = data.patterns.map((p) => p.name);
    this.P = data.patterns.length;

    // Each pattern is a bipolar vector, unpacked from one bit per pixel.
    this.X = data.patterns.map((p) => {
      const bytes = Uint8Array.from(atob(p.bits), (c) => c.charCodeAt(0));
      const v = new Float32Array(this.N);
      for (let i = 0; i < this.N; i++) {
        v[i] = (bytes[i >> 3] >> (7 - (i & 7))) & 1 ? 1 : -1;
      }
      return v;
    });

    this.Ginv = invert(
      this.X.map((a) => this.X.map((b) => dot(a, b))) // Gram matrix X^T X
    );

    this.u = new Float32Array(this.N);
    this.V = new Float32Array(this.N);
    this.h = new Float32Array(this.N);
    this.m = new Float64Array(this.P);
    this.c = new Float64Array(this.P);
    this.cue = new Float32Array(this.N);
    this.trace = [];
    this.steps = 0;
  }

  /* -------------------------------------------------------------- dynamics */

  /**
   * Project the current state onto the stored patterns: m = X^T V, and the
   * coefficients c that reconstruct the field from them. Both the field and the
   * energy need these, and both must see the *current* V.
   */
  coeffs() {
    const { X, P, N, V, m, c } = this;

    for (let p = 0; p < P; p++) m[p] = dot(X[p], V);

    if (this.rule === 'hebbian') {
      for (let p = 0; p < P; p++) c[p] = m[p] / N;
    } else {
      for (let p = 0; p < P; p++) {
        let s = 0;
        for (let q = 0; q < P; q++) s += this.Ginv[p][q] * m[q];
        c[p] = s;
      }
    }
  }

  /** Field h = W V, computed in the low-rank basis of the stored patterns. */
  field() {
    const { X, P, N, V, h, c } = this;
    this.coeffs();

    h.fill(0);
    for (let p = 0; p < P; p++) {
      const xp = X[p];
      const cp = c[p];
      for (let i = 0; i < N; i++) h[i] += xp[i] * cp;
    }

    // The Hebbian rule has no self-connections; subtract the diagonal it would
    // otherwise carry, W_ii = P/N.
    if (this.rule === 'hebbian') {
      const d = P / N;
      for (let i = 0; i < N; i++) h[i] -= d * V[i];
    }
  }

  step() {
    const { u, V, h, N, u0 } = this;
    this.field();

    let maxDelta = 0;
    for (let i = 0; i < N; i++) {
      const du = DT * (-u[i] + h[i]);
      u[i] += du;
      V[i] = Math.tanh(u[i] / u0);
      const a = du < 0 ? -du : du;
      if (a > maxDelta) maxDelta = a;
    }

    this.steps++;
    this.settled = maxDelta < SETTLE_TOL;
    this.pushTrace();
    return this.settled;
  }

  /** One trace sample per integration step, so the plot is speed-invariant. */
  pushTrace() {
    this.trace.push(this.energy());
    if (this.trace.length > TRACE_LEN) this.trace.shift();
  }

  /**
   * Lyapunov energy for the graded-response network. The second term is the
   * integral of the inverse gain function, which keeps E finite as V -> +-1.
   */
  energy() {
    const { u, V, N, u0, m, c } = this;
    this.coeffs(); // m and c must describe the current V, not the previous step's

    let quad = 0;
    for (let p = 0; p < this.P; p++) quad += c[p] * m[p];
    if (this.rule === 'hebbian') {
      let vv = 0;
      for (let i = 0; i < N; i++) vv += V[i] * V[i];
      quad -= (this.P / N) * vv;
    }

    let leak = 0;
    for (let i = 0; i < N; i++) leak += u[i] * V[i] - u0 * lncosh(u[i] / u0);

    return (-0.5 * quad + leak) / N;
  }

  overlaps() {
    return this.X.map((x) => dot(x, this.V) / this.N);
  }

  /* ----------------------------------------------------------- state setup */

  setState(vec, remember = true) {
    this.pause();
    for (let i = 0; i < this.N; i++) {
      this.u[i] = vec[i];
      this.V[i] = Math.tanh(this.u[i] / this.u0);
    }
    if (remember) this.cue.set(this.u);
    this.steps = 0;
    this.settled = false;
    this.trace = [];
    this.pushTrace();
    this.draw();
  }

  loadMemory(index) {
    this.cueIndex = index;
    this.setState(this.X[index]);
  }

  corrupt() {
    const frac = Number(this.noiseEl.value) / 100;
    const v = Float32Array.from(this.cue);
    for (let k = 0; k < Math.round(frac * this.N); k++) {
      const i = (Math.random() * this.N) | 0;
      v[i] = -v[i];
    }
    this.setState(v, false);
  }

  occlude() {
    const v = Float32Array.from(this.cue);
    // 40% is the most the Hebbian net recovers from for every stored memory;
    // erase more of a standing figure and it lands in a spurious state.
    const from = Math.round(this.size * 0.6);
    for (let y = from; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) v[y * this.size + x] = -1;
    }
    this.setState(v, false);
  }

  randomize() {
    const v = new Float32Array(this.N);
    for (let i = 0; i < this.N; i++) v[i] = Math.random() < 0.5 ? -1 : 1;
    this.cueIndex = -1;
    this.setState(v);
  }

  /* ------------------------------------------------------------------- run */

  run() {
    if (this.raf) return;
    this.acc = 0;

    // The speed slider can ask for less than one step per frame, so carry the
    // fractional remainder across frames instead of rounding it away.
    const tick = () => {
      this.acc += Number(this.speedEl.value);
      while (this.acc >= 1 && !this.settled) {
        this.step();
        this.acc -= 1;
      }
      this.draw();
      if (this.settled) this.pause();
      else this.raf = requestAnimationFrame(tick);
    };

    this.raf = requestAnimationFrame(tick);
    this.syncControls();
  }

  pause() {
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.syncControls();
  }

  toggleRun() {
    if (this.raf) this.pause();
    else if (!this.settled) this.run();
  }

  /* ---------------------------------------------------------------- render */

  renderShell() {
    this.innerHTML = `<div class="hp"><p class="hp-loading">Loading memories…</p></div>`;
  }

  buildUI() {
    const px = this.size;
    this.querySelector('.hp').innerHTML = `
      <div class="hp-main">
        <div class="hp-stage">
          <canvas class="hp-canvas" width="${px}" height="${px}"
                  aria-label="Network state, ${px} by ${px} neurons"></canvas>
          <p class="hp-hint">Drag on the image to corrupt it. Hold <kbd>shift</kbd> to erase.</p>
        </div>

        <div class="hp-side">
          <div class="hp-memories">
            <span class="hp-label">Memories</span>
            <div class="hp-thumbs">
              ${this.names
                .map(
                  (n, i) =>
                    `<button type="button" class="hp-thumb" data-mem="${i}" title="Load ${n}">
                       <canvas width="${px}" height="${px}" aria-label="${n}"></canvas>
                     </button>`
                )
                .join('')}
            </div>
          </div>

          <div class="hp-overlaps">
            <span class="hp-label">Overlap</span>
            ${this.names
              .map(
                (n, i) => `
              <div class="hp-bar-row" data-ov="${i}">
                <span class="hp-bar-name">${n}</span>
                <span class="hp-bar-track"><span class="hp-bar-fill"></span></span>
                <span class="hp-bar-val">0.00</span>
              </div>`
              )
              .join('')}
          </div>

          <div class="hp-energy">
            <span class="hp-label">Energy</span>
            <canvas class="hp-trace" width="${TRACE_LEN}" height="46"
                    aria-label="Energy over time"></canvas>
          </div>
        </div>
      </div>

      <div class="hp-bar">
        <div class="hp-readout">
          <span class="hp-chip"><span class="hp-chip-key">step</span><span class="hp-steps">0</span></span>
          <span class="hp-chip"><span class="hp-chip-key">energy</span><span class="hp-e">0</span></span>
          <span class="hp-chip hp-status"></span>
        </div>
        <div class="hp-controls">
          <button type="button" class="hp-btn" data-act="step">Step</button>
          <button type="button" class="hp-btn hp-btn-primary" data-act="run">Run</button>
          <button type="button" class="hp-btn" data-act="reset">Reset</button>
        </div>
      </div>

      <div class="hp-bar hp-bar-inputs">
        <label class="hp-field">
          <span>Speed</span>
          <input class="hp-speed" type="range" min="0.25" max="6" step="0.25" value="2">
        </label>
        <label class="hp-field">
          <span>Noise</span>
          <input class="hp-noise" type="range" min="0" max="40" step="5" value="30">
          <span class="hp-noise-val">30%</span>
        </label>
        <div class="hp-actions">
          <button type="button" class="hp-btn hp-btn-sm" data-act="corrupt">Corrupt</button>
          <button type="button" class="hp-btn hp-btn-sm" data-act="occlude">Occlude</button>
          <button type="button" class="hp-btn hp-btn-sm" data-act="random">Random</button>
        </div>
      </div>

      <p class="hp-legend">
        <span class="hp-mono">${this.N}</span> neurons wired by Hebb's rule, holding
        <span class="hp-mono">${this.P}</span> memories. Nothing is looked up: the corrupted image
        is simply the network's starting state, and it slides downhill in energy until it can go no
        lower. Where it stops <em>is</em> the recollection. Starting from noise can also strand it in
        a spurious blend of memories, or on a mirror image &mdash; every memory
        <span class="hp-mono">&xi;</span> has a twin attractor <span class="hp-mono">&minus;&xi;</span>.
      </p>
    `;

    this.canvas = this.querySelector('.hp-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.image = this.ctx.createImageData(px, px);

    this.traceCanvas = this.querySelector('.hp-trace');
    this.traceCtx = this.traceCanvas.getContext('2d');

    this.noiseEl = this.querySelector('.hp-noise');
    this.noiseValEl = this.querySelector('.hp-noise-val');
    this.speedEl = this.querySelector('.hp-speed');
    this.runBtn = this.querySelector('[data-act="run"]');
    this.stepBtn = this.querySelector('[data-act="step"]');
    this.stepsEl = this.querySelector('.hp-steps');
    this.energyEl = this.querySelector('.hp-e');
    this.statusEl = this.querySelector('.hp-status');

    this.drawThumbs();
    this.wire();
  }

  drawThumbs() {
    for (const btn of this.querySelectorAll('.hp-thumb')) {
      const idx = +btn.dataset.mem;
      const ctx = btn.querySelector('canvas').getContext('2d');
      const img = ctx.createImageData(this.size, this.size);
      paint(img, this.X[idx]);
      ctx.putImageData(img, 0, 0);
    }
  }

  wire() {
    this.stepBtn.addEventListener('click', () => {
      this.pause();
      this.step();
      this.draw();
    });
    this.runBtn.addEventListener('click', () => this.toggleRun());
    this.querySelector('[data-act="reset"]').addEventListener('click', () => this.setState(this.cue, false));
    this.querySelector('[data-act="corrupt"]').addEventListener('click', () => this.corrupt());
    this.querySelector('[data-act="occlude"]').addEventListener('click', () => this.occlude());
    this.querySelector('[data-act="random"]').addEventListener('click', () => this.randomize());

    for (const btn of this.querySelectorAll('.hp-thumb')) {
      btn.addEventListener('click', () => this.loadMemory(+btn.dataset.mem));
    }

    this.noiseEl.addEventListener('input', () => {
      this.noiseValEl.textContent = `${this.noiseEl.value}%`;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      this.painting = true;
      this.canvas.setPointerCapture(e.pointerId);
      this.paintAt(e);
    });
    this.canvas.addEventListener('pointermove', (e) => this.painting && this.paintAt(e));
    this.canvas.addEventListener('pointerup', () => (this.painting = false));
    this.canvas.addEventListener('pointercancel', () => (this.painting = false));
  }

  paintAt(event) {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const cx = Math.floor(((event.clientX - rect.left) / rect.width) * this.size);
    const cy = Math.floor(((event.clientY - rect.top) / rect.height) * this.size);
    const value = event.shiftKey ? -1 : 1;

    for (let dy = -BRUSH; dy <= BRUSH; dy++) {
      for (let dx = -BRUSH; dx <= BRUSH; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= this.size || y >= this.size) continue;
        const i = y * this.size + x;
        this.u[i] = value;
        this.V[i] = Math.tanh(value / this.u0);
      }
    }

    this.settled = false;
    this.draw();
  }

  /* ----------------------------------------------------------------- paint */

  draw() {
    paint(this.image, this.V);
    this.ctx.putImageData(this.image, 0, 0);

    const e = this.energy();
    this.drawTrace();

    const ov = this.overlaps();
    let best = 0;
    for (let i = 1; i < this.P; i++) if (Math.abs(ov[i]) > Math.abs(ov[best])) best = i;

    for (const row of this.querySelectorAll('.hp-bar-row')) {
      const i = +row.dataset.ov;
      const v = ov[i];
      row.querySelector('.hp-bar-fill').style.width = `${Math.abs(v) * 100}%`;
      row.querySelector('.hp-bar-val').textContent = v.toFixed(2);
      row.classList.toggle('is-best', i === best && Math.abs(v) > 0.5);
      row.classList.toggle('is-negative', v < 0);
    }

    for (const btn of this.querySelectorAll('.hp-thumb')) {
      btn.classList.toggle('is-cue', +btn.dataset.mem === this.cueIndex);
    }

    this.stepsEl.textContent = this.steps;
    this.energyEl.textContent = e.toFixed(4);

    const near = Math.abs(ov[best]);
    if (this.settled) {
      const exact = near > 0.999;
      this.statusEl.textContent = exact
        ? `settled on ${ov[best] < 0 ? 'inverted ' : ''}${this.names[best]}`
        : 'settled on a spurious state';
      this.statusEl.className = `hp-chip hp-status ${exact ? 'is-good' : 'is-bad'}`;
    } else {
      this.statusEl.textContent = 'relaxing…';
      this.statusEl.className = 'hp-chip hp-status';
    }

    this.syncControls();
  }

  drawTrace() {
    const canvas = this.traceCanvas;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || TRACE_LEN;
    const h = 46;

    // Give the canvas a backing store that matches its box, so the line is crisp.
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    const ctx = this.traceCtx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (this.trace.length < 2) return;

    let lo = Infinity;
    let hi = -Infinity;
    for (const v of this.trace) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const span = hi - lo || 1;
    const dx = w / (this.trace.length - 1);

    ctx.beginPath();
    this.trace.forEach((v, i) => {
      const x = i * dx;
      const y = 3 + (1 - (v - lo) / span) * (h - 6);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = getComputedStyle(this).getPropertyValue('--hp-accent').trim() || '#2f6fb3';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  syncControls() {
    this.runBtn.textContent = this.raf ? 'Pause' : 'Run';
    this.runBtn.disabled = this.settled && !this.raf;
    this.stepBtn.disabled = this.settled;
  }
}

/* ---------------------------------------------------------------- helpers */

/** V in [-1, 1] to greyscale: +1 (ink) is black, -1 (background) is white. */
function paint(image, V) {
  const d = image.data;
  for (let i = 0; i < V.length; i++) {
    const g = Math.round((1 - V[i]) * 127.5);
    d[i * 4] = g;
    d[i * 4 + 1] = g;
    d[i * 4 + 2] = g;
    d[i * 4 + 3] = 255;
  }
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** log(cosh x), written to stay finite for large |x|. */
function lncosh(x) {
  const a = Math.abs(x);
  return a + Math.log1p(Math.exp(-2 * a)) - Math.LN2;
}

/** Gauss-Jordan inverse of a small dense matrix. */
function invert(A) {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];

    const p = M[col][col];
    if (!p) throw new Error('<blog-hopfield> patterns are linearly dependent');
    for (let j = 0; j < 2 * n; j++) M[col][j] /= p;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (!f) continue;
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j];
    }
  }

  return M.map((row) => row.slice(n));
}

customElements.define('blog-hopfield', BlogHopfield);

export default BlogHopfield;
