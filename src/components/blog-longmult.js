/**
 * <blog-longmult> Component
 * The long-multiplication algorithm as a runnable state machine.
 *
 * The same flow-chart the essay describes, but you can step through it: the
 * current state lights up in the diagram while a worked example (17 x 24 by
 * default, editable) updates in lock-step beside it — digit pointers, the
 * single-digit product on the scratch pad, the partial-product rows, and the
 * final sum. Watching the state travel the graph is the point: it makes the
 * abstract notions of state and transition rule concrete.
 *
 * Usage:
 *   <blog-longmult></blog-longmult>
 *   <blog-longmult top="123" bottom="45"></blog-longmult>
 */

// Each state: short label for the node, a fuller note for the status line, a
// position, and an `run(ctx)` that mutates the worked example and returns the
// id of the next state. Decisions branch inside run().
const STATES = [
  {
    id: 'start',
    kind: 'action',
    label: 'Write the factors',
    note: (c) => `Write ${c.topStr} over ${c.bottomStr}, right-aligned.`,
    x: 300, y: 46,
    run: (c) => {
      c.rows = [];
      c.bottomUsed = 0;
      c.bi = c.ti = -1;
      c.row = 0;
      c.product = null;
      return 'choose_bottom';
    }
  },
  {
    id: 'choose_bottom',
    kind: 'action',
    label: 'Pick next bottom digit',
    note: (c) => `Move to the next bottom digit: ${c.bottom[c.bottomUsed]}.`,
    x: 300, y: 122,
    run: (c) => {
      c.bi = c.bottomUsed;
      c.bottomUsed += 1;
      c.topUsed = 0;
      c.row = 0;
      c.ti = -1;
      return 'choose_top';
    }
  },
  {
    id: 'choose_top',
    kind: 'action',
    label: 'Pick next top digit',
    note: (c) => `Pick the next top digit: ${c.top[c.topUsed]}.`,
    x: 300, y: 198,
    run: (c) => {
      c.ti = c.topUsed;
      c.topUsed += 1;
      return 'multiply';
    }
  },
  {
    id: 'multiply',
    kind: 'action',
    label: 'Multiply the two digits',
    note: (c) => `Look up ${c.bottom[c.bi]} × ${c.top[c.ti]} = ${c.bottom[c.bi] * c.top[c.ti]}.`,
    x: 300, y: 274,
    run: (c) => {
      c.product = c.bottom[c.bi] * c.top[c.ti];
      return 'place_product';
    }
  },
  {
    id: 'place_product',
    kind: 'action',
    label: 'Add it to the row',
    note: (c) => {
      const shift = c.bi + c.ti;
      const placed = c.product * 10 ** shift;
      return shift === 0
        ? `Add ${c.product} to the row (row ${c.row} → ${c.row + placed}).`
        : `Shift ${c.product} left ${shift} place${shift > 1 ? 's' : ''} to ${placed}, then add (row ${c.row} → ${c.row + placed}).`;
    },
    x: 300, y: 350,
    run: (c) => {
      c.row += c.product * 10 ** (c.bi + c.ti);
      return 'next_top';
    }
  },
  {
    id: 'next_top',
    kind: 'decision',
    label: 'More top digits?',
    note: (c) =>
      c.topUsed < c.top.length
        ? `More top digits to pair with ${c.bottom[c.bi]}? Yes — take ${c.top[c.topUsed]} next.`
        : `More top digits? No — this row is finished: ${c.row}.`,
    x: 300, y: 430,
    run: (c) => {
      if (c.topUsed < c.top.length) return 'choose_top';
      c.rows.push(c.row); // row for this bottom digit is finished
      return 'next_bottom';
    }
  },
  {
    id: 'next_bottom',
    kind: 'decision',
    label: 'More bottom digits?',
    note: (c) =>
      c.bottomUsed < c.bottom.length
        ? `More bottom digits? Yes — the next one is ${c.bottom[c.bottomUsed]}.`
        : `More bottom digits? No — add the rows together.`,
    x: 300, y: 510,
    run: (c) => (c.bottomUsed < c.bottom.length ? 'shift_row' : 'sum_rows')
  },
  {
    id: 'shift_row',
    kind: 'action',
    label: 'Start a new row',
    note: (c) => `Start a fresh row for ${c.bottom[c.bottomUsed]}, shifted one place left.`,
    x: 92, y: 510,
    run: () => 'choose_bottom'
  },
  {
    id: 'sum_rows',
    kind: 'action',
    label: 'Sum the rows',
    note: (c) =>
      c.rows.length > 1
        ? `Add the rows: ${c.rows.join(' + ')} = ${c.rows.reduce((a, b) => a + b, 0)}.`
        : `Just one row, so that is the answer: ${c.rows[0]}.`,
    x: 300, y: 586,
    run: (c) => {
      c.answer = c.rows.reduce((a, b) => a + b, 0);
      return 'end';
    }
  }
];

// Hand-routed edges: straight spine, two loop-backs, Yes/No on the decisions.
const EDGES = [
  { from: 'start', to: 'choose_bottom', d: 'M300,67 L300,101' },
  { from: 'choose_bottom', to: 'choose_top', d: 'M300,143 L300,177' },
  { from: 'choose_top', to: 'multiply', d: 'M300,219 L300,253' },
  { from: 'multiply', to: 'place_product', d: 'M300,295 L300,329' },
  { from: 'place_product', to: 'next_top', d: 'M300,371 L300,409' },
  { from: 'next_top', to: 'choose_top', label: 'yes', lx: 486, ly: 314,
    d: 'M400,430 L472,430 L472,198 L400,198' },
  { from: 'next_top', to: 'next_bottom', label: 'no', lx: 314, ly: 470,
    d: 'M300,451 L300,489' },
  { from: 'next_bottom', to: 'shift_row', label: 'yes', lx: 186, ly: 499,
    d: 'M200,510 L169,510' },
  { from: 'shift_row', to: 'choose_bottom', d: 'M92,489 L92,122 L200,122' },
  { from: 'next_bottom', to: 'sum_rows', label: 'no', lx: 314, ly: 550,
    d: 'M300,531 L300,565' },
  { from: 'sum_rows', to: 'end', d: 'M300,607 L300,628' }
];

const NODE_W = 200;
const NODE_H = 42;
const SHIFT_W = 150;

class BlogLongmult extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;

    this.byId = new Map(STATES.map((s) => [s.id, s]));
    this.speed = 1.4;
    this.render();
    this.load(this.getAttribute('top') || '17', this.getAttribute('bottom') || '24');
  }

  disconnectedCallback() {
    this.pause();
  }

  /* ------------------------------------------------------------------ model */

  load(topStr, bottomStr) {
    this.pause();
    topStr = String(topStr).replace(/\D/g, '') || '0';
    bottomStr = String(bottomStr).replace(/\D/g, '') || '0';

    this.ctx = {
      topStr,
      bottomStr,
      // index 0 = rightmost (units) digit
      top: [...topStr].reverse().map(Number),
      bottom: [...bottomStr].reverse().map(Number),
      rows: [],
      bi: -1,
      ti: -1,
      row: 0,
      bottomUsed: 0,
      topUsed: 0,
      product: null,
      answer: null
    };
    this.current = 'start';
    this.done = false;
    this.paint();
  }

  step() {
    if (this.done) return false;
    const next = this.byId.get(this.current).run(this.ctx);
    if (next === 'end') {
      this.done = true;
      this.current = 'sum_rows';
    } else {
      this.current = next;
    }
    this.paint();
    if (this.done) this.pause();
    return !this.done;
  }

  run() {
    if (this.timer || this.done) return;
    this.timer = setInterval(() => this.step(), 1000 / this.speed);
    this.syncControls();
  }

  pause() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    this.syncControls();
  }

  toggleRun() {
    if (this.timer) this.pause();
    else this.run();
  }

  /* ----------------------------------------------------------------- render */

  render() {
    this.innerHTML = `
      <div class="lm">
        <div class="lm-main">
          <div class="lm-diagram">${this.diagramSvg()}</div>

          <div class="lm-side">
            <div class="lm-work"></div>
            <p class="lm-note" aria-live="polite"></p>
          </div>
        </div>

        <div class="lm-bar">
          <div class="lm-factors">
            <input class="lm-in lm-top" type="text" inputmode="numeric" aria-label="top factor" value="17">
            <span class="lm-times">&times;</span>
            <input class="lm-in lm-bottom" type="text" inputmode="numeric" aria-label="bottom factor" value="24">
          </div>
          <div class="lm-controls">
            <button type="button" class="lm-btn" data-act="step">Step</button>
            <button type="button" class="lm-btn lm-btn-primary" data-act="run">Run</button>
            <button type="button" class="lm-btn" data-act="reset">Reset</button>
          </div>
        </div>
      </div>
    `;

    this.diagramEl = this.querySelector('.lm-diagram');
    this.workEl = this.querySelector('.lm-work');
    this.noteEl = this.querySelector('.lm-note');
    this.topIn = this.querySelector('.lm-top');
    this.bottomIn = this.querySelector('.lm-bottom');
    this.runBtn = this.querySelector('[data-act="run"]');
    this.stepBtn = this.querySelector('[data-act="step"]');

    this.stepBtn.addEventListener('click', () => {
      this.pause();
      this.step();
    });
    this.runBtn.addEventListener('click', () => this.toggleRun());
    this.querySelector('[data-act="reset"]').addEventListener('click', () =>
      this.load(this.topIn.value, this.bottomIn.value)
    );

    const onEdit = () => {
      const t = this.topIn.value.replace(/\D/g, '');
      const b = this.bottomIn.value.replace(/\D/g, '');
      if (t && b && t.length <= 4 && b.length <= 4) this.load(t, b);
    };
    this.topIn.addEventListener('input', onEdit);
    this.bottomIn.addEventListener('input', onEdit);
  }

  diagramSvg() {
    let nodes = '';
    for (const s of STATES) {
      const w = s.id === 'shift_row' ? SHIFT_W : NODE_W;
      const rx = s.kind === 'decision' ? 21 : 6;
      nodes += `
        <g class="lm-node lm-${s.kind}" data-id="${s.id}">
          <rect x="${s.x - w / 2}" y="${s.y - NODE_H / 2}" width="${w}" height="${NODE_H}" rx="${rx}"/>
          <text x="${s.x}" y="${s.y}">${escapeHtml(s.label)}</text>
        </g>`;
    }

    // terminal dot below sum_rows
    nodes += `<circle class="lm-terminal" cx="300" cy="632" r="7"/>`;

    let edges = '';
    for (const e of EDGES) {
      edges += `<path class="lm-edge" data-edge="${e.from}--${e.to}" d="${e.d}" marker-end="url(#lm-arrow)"/>`;
      if (e.label) {
        edges += `<text class="lm-edge-label" x="${e.lx}" y="${e.ly}">${e.label}</text>`;
      }
    }

    return `
      <svg viewBox="0 0 520 660" role="img" aria-label="State diagram of the long-multiplication algorithm">
        <defs>
          <marker id="lm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0.5 L8,4 L0,7.5 z"/>
          </marker>
        </defs>
        ${edges}
        ${nodes}
      </svg>
    `;
  }

  /* ----------------------------------------------------------------- repaint */

  paint() {
    // highlight the current node + its incoming edge
    for (const g of this.querySelectorAll('.lm-node')) {
      g.classList.toggle('is-current', g.dataset.id === this.current && !this.done);
      g.classList.toggle('is-done', this.done && g.dataset.id === 'sum_rows');
    }

    this.renderWork();
    const s = this.byId.get(this.current);
    this.noteEl.textContent = this.done
      ? `Done — ${this.ctx.topStr} × ${this.ctx.bottomStr} = ${this.ctx.answer}.`
      : typeof s.note === 'function'
        ? s.note(this.ctx)
        : s.note;

    this.syncControls();
  }

  renderWork() {
    const c = this.ctx;
    const width = Math.max(c.topStr.length + c.bottomStr.length, ...c.rows.map((r) => String(r).length), 1);

    const factorRow = (str, hi, symbol) => {
      const pad = width - str.length - (symbol ? 1 : 0);
      let cells = symbol ? `<span class="lm-cell lm-op">${symbol}</span>` : '';
      cells += '<span class="lm-cell"></span>'.repeat(Math.max(0, pad));
      [...str].forEach((d, i) => {
        // hi is the position index from the right that is active
        const posFromRight = str.length - 1 - i;
        const active = hi != null && posFromRight === hi;
        cells += `<span class="lm-cell${active ? ' is-hi' : ''}">${d}</span>`;
      });
      return `<div class="lm-drow">${cells}</div>`;
    };

    const numRow = (n, cls = '') => {
      const str = String(n);
      const pad = width - str.length;
      let cells = '<span class="lm-cell"></span>'.repeat(Math.max(0, pad));
      cells += [...str].map((d) => `<span class="lm-cell">${d}</span>`).join('');
      return `<div class="lm-drow ${cls}">${cells}</div>`;
    };

    // scratch line: the single-digit product on the pad (the note explains the shift)
    let scratch = '';
    if (c.product != null && !this.done && this.current === 'place_product') {
      scratch = `<div class="lm-scratch"><span class="lm-mono">${c.bottom[c.bi]} &times; ${c.top[c.ti]} = ${c.product}</span></div>`;
    }

    const committed = c.rows.map((r) => numRow(r, 'lm-committed')).join('');
    // in-progress row (only while building the current bottom digit's row)
    const building =
      !this.done && c.bi >= 0 && this.current !== 'choose_bottom' && this.current !== 'shift_row' && c.rows.length < c.bottomUsed
        ? numRow(c.row, 'lm-building')
        : '';

    const sum =
      this.done
        ? `<div class="lm-rule"></div>${numRow(c.answer, 'lm-answer')}`
        : c.rows.length > 1 && this.current === 'sum_rows'
          ? `<div class="lm-rule"></div>`
          : '';

    this.workEl.innerHTML = `
      ${factorRow(c.topStr, this.current === 'choose_top' || scratch ? c.ti : null)}
      ${factorRow(c.bottomStr, c.bi >= 0 && !this.done ? c.bi : null, '×')}
      <div class="lm-rule"></div>
      ${committed}
      ${building}
      ${sum}
      ${scratch}
    `;
  }

  syncControls() {
    if (!this.runBtn) return;
    this.runBtn.textContent = this.timer ? 'Pause' : 'Run';
    this.runBtn.disabled = this.done;
    this.stepBtn.disabled = this.done;
  }
}

const escapeHtml = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

customElements.define('blog-longmult', BlogLongmult);

export default BlogLongmult;
