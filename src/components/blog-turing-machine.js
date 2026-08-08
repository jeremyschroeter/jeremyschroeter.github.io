/**
 * <blog-turing-machine> Component
 * An interactive Turing machine: tape, state diagram, and transition table,
 * all driven by the same rule set and highlighted in lockstep as you step.
 *
 * Usage:
 * <blog-turing-machine
 *     tape="abba"
 *     start="start"
 *     accept="accept"
 *     reject="reject"
 *     layout="start:70,200; haveA:210,90"
 *     curve="start>accept:-150">
 *   # state, read -> next, write, move      (move is L, R or N)
 *   start, a -> haveA, _, R
 *   start, _ -> accept, _, R
 * </blog-turing-machine>
 *
 * `_` is the blank symbol (configurable via the blank attribute). Blank cells
 * render empty on the tape and as the blank-display glyph elsewhere.
 *
 * layout places diagram nodes; unplaced states fall back to a circle.
 * curve bows an edge sideways by N pixels, for routing around nodes.
 * Self-loops bulge away from the centre of the graph.
 */

const CELL_W = 36;
const MOVES = { L: -1, R: 1, N: 0 };
const RULE_RE = /^([A-Za-z0-9_-]+)\s*,\s*(\S+)\s*->\s*([A-Za-z0-9_-]+)\s*,\s*(\S+)\s*,\s*([LRN])$/i;

// Diagram geometry
const NODE_RY = 18;
const LOOP_R = 58;
const ARROW_GAP = 4;
const CHAR_W = 6.4;
const LINE_H = 13;

let uid = 0;

class BlogTuringMachine extends HTMLElement {
  connectedCallback() {
    if (this._spec === undefined) this._spec = this.textContent;

    this.parseSpec();
    if (!this.startState) {
      console.warn('<blog-turing-machine> needs a start attribute');
      return;
    }

    this.arrowId = `tm-arrow-${++uid}`;
    this.render();
    this.reset();
  }

  disconnectedCallback() {
    this.pause();
  }

  /* ---------------------------------------------------------------- spec */

  parseSpec() {
    this.blank = this.getAttribute('blank') || '_';
    this.blankGlyph = this.getAttribute('blank-display') || '⊔';
    this.startState = this.getAttribute('start');

    this.halting = new Map(); // state -> 'accept' | 'reject'
    for (const s of splitList(this.getAttribute('accept'))) this.halting.set(s, 'accept');
    for (const s of splitList(this.getAttribute('reject'))) this.halting.set(s, 'reject');

    this.verdicts = {
      accept: this.getAttribute('accept-message') || 'Accepted.',
      reject: this.getAttribute('reject-message') || 'Rejected.',
      halt: 'Halted — no transition for this state and symbol.'
    };

    this.rules = new Map(); // state -> Map(read -> {to, write, move})
    const states = new Set(this.startState ? [this.startState] : []);
    const symbols = new Set();

    for (const raw of this._spec.split('\n')) {
      const line = raw.split('#')[0].trim();
      if (!line) continue;

      const m = line.match(RULE_RE);
      if (!m) {
        console.warn('<blog-turing-machine> ignoring unparsable rule:', line);
        continue;
      }

      const [, from, read, to, write, moveLetter] = m;
      if (!this.rules.has(from)) this.rules.set(from, new Map());
      this.rules.get(from).set(read, { to, write, move: MOVES[moveLetter.toUpperCase()] });

      states.add(from).add(to);
      symbols.add(read).add(write);
    }

    // Halting states sort last, so the diagram and table read left to right.
    this.states = [...states].sort((a, b) => (this.halting.has(a) ? 1 : 0) - (this.halting.has(b) ? 1 : 0));

    symbols.delete(this.blank);
    this.alphabet = [...symbols].sort();
    this.symbols = [...this.alphabet, this.blank];
  }

  parseLayout() {
    const positions = new Map();
    for (const entry of (this.getAttribute('layout') || '').split(';')) {
      const m = entry.trim().match(/^([\w-]+)\s*:\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)$/);
      if (m) positions.set(m[1], { x: +m[2], y: +m[3] });
    }

    const missing = this.states.filter((s) => !positions.has(s));
    const radius = Math.max(120, missing.length * 26);
    missing.forEach((name, i) => {
      const a = (2 * Math.PI * i) / missing.length - Math.PI / 2;
      positions.set(name, { x: radius * (1 + Math.cos(a)), y: radius * (1 + Math.sin(a)) });
    });

    return positions;
  }

  parseCurves() {
    const curves = new Map();
    for (const entry of (this.getAttribute('curve') || '').split(';')) {
      const m = entry.trim().match(/^([\w-]+)\s*>\s*([\w-]+)\s*:\s*(-?[\d.]+)$/);
      if (m) curves.set(`${m[1]}|${m[2]}`, +m[3]);
    }
    return curves;
  }

  /* -------------------------------------------------------------- machine */

  reset() {
    this.pause();

    this.tape = new Map();
    [...this.inputEl.value].forEach((sym, i) => this.tape.set(i, sym));

    this.head = 0;
    this.state = this.startState;
    this.steps = 0;
    this.status = 'ready';

    this.minIdx = 0;
    this.maxIdx = 0;
    this.ensureRange(this.head);
    this.update({ animate: false });
  }

  /** The rule that will fire on the next step, or null if the machine is stuck. */
  get pendingRule() {
    if (this.status in this.verdicts) return null;
    return this.rules.get(this.state)?.get(this.readSymbol) ?? null;
  }

  get readSymbol() {
    return this.tape.get(this.head) ?? this.blank;
  }

  step() {
    const rule = this.pendingRule;
    if (!rule) {
      if (!(this.status in this.verdicts)) {
        this.setStatus('halt');
        this.update({ animate: false });
      }
      return false;
    }

    if (rule.write === this.blank) this.tape.delete(this.head);
    else this.tape.set(this.head, rule.write);

    const from = this.head;
    this.head += rule.move;
    this.state = rule.to;
    this.steps++;

    const halt = this.halting.get(this.state);
    this.setStatus(halt ?? (this.timer ? 'running' : 'ready'));

    this.ensureRange(from);
    this.update({ animate: true });
    return !halt;
  }

  setStatus(status) {
    this.status = status;
    if (status in this.verdicts) this.pause();
  }

  run() {
    if (this.timer || !this.pendingRule) return;
    this.status = 'running';
    this.timer = setInterval(() => this.step(), 1000 / Number(this.speedEl.value));
    this.syncControls();
  }

  pause() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    if (this.status === 'running') this.status = 'ready';
    if (this.runBtn) this.syncControls();
  }

  toggleRun() {
    if (this.timer) this.pause();
    else this.run();
  }

  /* --------------------------------------------------------------- render */

  render() {
    const showDiagram = !this.hasAttribute('no-diagram');
    const showTable = !this.hasAttribute('no-table');

    this.innerHTML = `
      <div class="tm">
        <div class="tm-tape">
          <div class="tm-head" aria-hidden="true"></div>
          <div class="tm-strip"></div>
        </div>

        <div class="tm-bar">
          <div class="tm-readout">
            <span class="tm-chip">
              <span class="tm-chip-key">state</span>
              <span class="tm-state-name"></span>
            </span>
            <span class="tm-chip">
              <span class="tm-chip-key">read</span>
              <span class="tm-read-sym"></span>
            </span>
            <span class="tm-chip">
              <span class="tm-chip-key">steps</span>
              <span class="tm-step-count"></span>
            </span>
          </div>

          <div class="tm-controls">
            <button type="button" class="tm-btn" data-act="step">Step</button>
            <button type="button" class="tm-btn tm-btn-primary" data-act="run">Run</button>
            <button type="button" class="tm-btn" data-act="reset">Reset</button>
          </div>
        </div>

        <div class="tm-bar tm-bar-inputs">
          <label class="tm-field">
            <span>Input</span>
            <input class="tm-input" type="text" spellcheck="false" autocomplete="off"
                   value="${escapeAttr(this.getAttribute('tape') || '')}">
          </label>
          <label class="tm-field tm-field-speed">
            <span>Speed</span>
            <input class="tm-speed" type="range" min="1" max="20" step="1" value="6">
          </label>
        </div>

        <div class="tm-verdict" aria-live="polite"></div>

        ${showDiagram ? '<div class="tm-diagram"></div>' : ''}
        ${showTable ? '<div class="tm-table-wrap"></div>' : ''}

        <p class="tm-legend">
          Labels read <span class="tm-mono">read → write, move</span>, with the written symbol
          omitted where the cell is left unchanged. <span class="tm-mono">${this.blankGlyph}</span>
          is the blank symbol. Type any string of
          <span class="tm-mono">${this.alphabet.join('')}</span> into the input to try your own.
        </p>
      </div>
    `;

    this.stripEl = this.querySelector('.tm-strip');
    this.inputEl = this.querySelector('.tm-input');
    this.speedEl = this.querySelector('.tm-speed');
    this.runBtn = this.querySelector('[data-act="run"]');
    this.stepBtn = this.querySelector('[data-act="step"]');
    this.verdictEl = this.querySelector('.tm-verdict');
    this.stateNameEl = this.querySelector('.tm-state-name');
    this.readSymEl = this.querySelector('.tm-read-sym');
    this.stepCountEl = this.querySelector('.tm-step-count');

    if (showDiagram) this.renderDiagram();
    if (showTable) this.renderTable();

    this.stepBtn.addEventListener('click', () => {
      this.pause();
      this.step();
    });
    this.runBtn.addEventListener('click', () => this.toggleRun());
    this.querySelector('[data-act="reset"]').addEventListener('click', () => this.reset());

    this.speedEl.addEventListener('input', () => {
      if (!this.timer) return;
      this.pause();
      this.run();
    });

    this.inputEl.addEventListener('input', () => {
      const valid = [...this.inputEl.value].every((c) => this.alphabet.includes(c));
      this.inputEl.classList.toggle('is-invalid', !valid);
      if (valid) this.reset();
    });
  }

  /**
   * Grow the rendered window when the head nears either end. A rebuild shifts
   * every cell, so re-anchor the strip on `anchor` first; update() then slides
   * from there to the new head position.
   */
  ensureRange(anchor) {
    const margin = 14;
    const before = `${this.minIdx}:${this.maxIdx}`;

    while (this.head - this.minIdx < margin) this.minIdx -= 20;
    while (this.maxIdx - this.head < margin) this.maxIdx += 20;

    if (`${this.minIdx}:${this.maxIdx}` === before && this.stripEl.childElementCount) return;

    let html = '';
    for (let i = this.minIdx; i <= this.maxIdx; i++) html += `<div class="tm-cell" data-i="${i}"></div>`;
    this.stripEl.innerHTML = html;

    this.placeStrip(anchor, false);
  }

  placeStrip(index, animate) {
    this.stripEl.style.transition = animate ? '' : 'none';
    this.stripEl.style.transform = `translateX(${-(index - this.minIdx) * CELL_W}px)`;
    if (!animate) void this.stripEl.offsetWidth; // flush, so the next move animates
  }

  update({ animate }) {
    for (const cell of this.stripEl.children) {
      const i = +cell.dataset.i;
      cell.textContent = this.tape.get(i) ?? '';
      cell.classList.toggle('is-head', i === this.head);
    }

    this.placeStrip(this.head, animate);

    this.stateNameEl.textContent = this.state;
    this.stateNameEl.className = `tm-state-name ${statusClass(this.halting.get(this.state))}`;
    this.readSymEl.textContent = this.glyph(this.readSymbol);
    this.stepCountEl.textContent = this.steps;

    this.verdictEl.textContent = this.verdicts[this.status] ?? '';
    this.verdictEl.className = `tm-verdict ${statusClass(this.status)}`;

    this.syncControls();
    this.highlight();
  }

  syncControls() {
    const stuck = !this.pendingRule;
    this.runBtn.textContent = this.timer ? 'Pause' : 'Run';
    this.runBtn.disabled = stuck;
    this.stepBtn.disabled = stuck;
  }

  /** Light up the rule about to fire, in both the diagram and the table. */
  highlight() {
    for (const el of this.querySelectorAll('.is-firing, .is-current')) {
      el.classList.remove('is-firing', 'is-current');
    }

    const rule = this.pendingRule;
    if (rule) {
      for (const el of this.querySelectorAll(`[data-rule="${attrSel(`${this.state}|${this.readSymbol}`)}"]`)) {
        el.classList.add('is-firing');
      }
      const edge = this.querySelector(`[data-edge="${attrSel(`${this.state}|${rule.to}`)}"]`);
      if (edge) edge.classList.add('is-firing');
    }

    for (const el of this.querySelectorAll(`[data-state="${attrSel(this.state)}"]`)) {
      el.classList.add('is-current');
    }
  }

  /* -------------------------------------------------------------- diagram */

  renderDiagram() {
    const positions = this.parseLayout();
    const curves = this.parseCurves();

    const nodes = new Map(
      this.states.map((name) => {
        const { x, y } = positions.get(name);
        return [name, { name, x, y, rx: name.length * 3.5 + 14, ry: NODE_RY, kind: this.halting.get(name) }];
      })
    );

    // One edge per (from, to) pair; parallel rules stack as label lines.
    const edges = new Map();
    for (const [from, byRead] of this.rules) {
      for (const [read, { to, write, move }] of byRead) {
        const key = `${from}|${to}`;
        if (!edges.has(key)) edges.set(key, { from, to, labels: [] });
        const written = write === read ? '' : `${this.glyph(write)}, `;
        const moveLetter = move > 0 ? 'R' : move < 0 ? 'L' : 'N';
        edges.get(key).labels.push({
          rule: `${from}|${read}`,
          text: `${this.glyph(read)} → ${written}${moveLetter}`
        });
      }
    }

    const cx = mean([...nodes.values()].map((n) => n.x));
    const cy = mean([...nodes.values()].map((n) => n.y));

    const bounds = new Bounds();
    for (const n of nodes.values()) bounds.add(n.x - n.rx, n.y - n.ry).add(n.x + n.rx, n.y + n.ry);

    let paths = '';
    let labels = '';

    for (const edge of edges.values()) {
      const a = nodes.get(edge.from);
      const b = nodes.get(edge.to);
      const reciprocal = edges.has(`${edge.to}|${edge.from}`);
      const curve = curves.get(`${edge.from}|${edge.to}`) ?? (reciprocal ? 24 : 0);

      const geom =
        edge.from === edge.to
          ? selfLoop(a, Math.atan2(a.y - cy, a.x - cx))
          : bezier(a, b, curve);

      for (const [x, y] of geom.extent) bounds.add(x, y);

      paths +=
        `<path class="tm-edge" data-edge="${escapeAttr(`${edge.from}|${edge.to}`)}"` +
        ` d="${geom.d}" marker-end="url(#${this.arrowId})"/>`;
      labels += this.edgeLabel(edge.labels, geom.labelX, geom.labelY, bounds);
    }

    let circles = '';
    for (const n of nodes.values()) {
      circles += `
        <g class="tm-node ${statusClass(n.kind)}" data-state="${escapeAttr(n.name)}">
          ${n.kind ? `<ellipse class="tm-node-ring" cx="${n.x}" cy="${n.y}" rx="${n.rx + 4}" ry="${n.ry + 4}"/>` : ''}
          <ellipse class="tm-node-body" cx="${n.x}" cy="${n.y}" rx="${n.rx}" ry="${n.ry}"/>
          <text class="tm-node-text" x="${n.x}" y="${n.y}">${escapeHtml(n.name)}</text>
        </g>`;
    }

    const pad = 14;
    const w = bounds.maxX - bounds.minX + pad * 2;
    const h = bounds.maxY - bounds.minY + pad * 2;

    this.querySelector('.tm-diagram').innerHTML = `
      <svg viewBox="${r(bounds.minX - pad)} ${r(bounds.minY - pad)} ${r(w)} ${r(h)}"
           role="img" aria-label="State diagram of the transition function"
           style="max-width:${Math.round(w)}px">
        <defs>
          <marker id="${this.arrowId}" viewBox="0 0 8 8" refX="7" refY="4"
                  markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0.5 L8,4 L0,7.5 z"/>
          </marker>
        </defs>
        ${paths}
        ${labels}
        ${circles}
      </svg>
    `;
  }

  edgeLabel(lines, x, y, bounds) {
    const w = Math.max(...lines.map((l) => l.text.length)) * CHAR_W + 8;
    const h = lines.length * LINE_H + 4;
    const top = y - h / 2;

    bounds.add(x - w / 2, top).add(x + w / 2, top + h);

    const texts = lines
      .map(
        (l, i) =>
          `<text class="tm-edge-label" data-rule="${escapeAttr(l.rule)}"` +
          ` x="${r(x)}" y="${r(top + 2 + LINE_H * (i + 0.5))}">${escapeHtml(l.text)}</text>`
      )
      .join('');

    return `<g class="tm-label"><rect x="${r(x - w / 2)}" y="${r(top)}" width="${r(w)}" height="${r(h)}" rx="3"/>${texts}</g>`;
  }

  glyph(sym) {
    return sym === this.blank ? this.blankGlyph : sym;
  }

  /* ---------------------------------------------------------------- table */

  renderTable() {
    const head = this.symbols.map((s) => `<th>${escapeHtml(this.glyph(s))}</th>`).join('');

    const rows = this.states
      .filter((s) => this.rules.has(s))
      .map((state) => {
        const cells = this.symbols
          .map((sym) => {
            const rule = this.rules.get(state).get(sym);
            if (!rule) return '<td class="tm-cell-empty">—</td>';
            const moveLetter = rule.move > 0 ? 'R' : rule.move < 0 ? 'L' : 'N';
            return (
              `<td data-rule="${escapeAttr(`${state}|${sym}`)}">` +
              `${escapeHtml(rule.to)}, ${escapeHtml(this.glyph(rule.write))}, ${moveLetter}</td>`
            );
          })
          .join('');
        return `<tr><th data-state="${escapeAttr(state)}">${escapeHtml(state)}</th>${cells}</tr>`;
      })
      .join('');

    this.querySelector('.tm-table-wrap').innerHTML = `
      <table class="tm-table">
        <thead><tr><th class="tm-corner"></th>${head}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }
}

/* ------------------------------------------------------------- geometry */

/** Where the ray from a node's centre toward (tx, ty) crosses its ellipse. */
function boundary(node, tx, ty) {
  const dx = tx - node.x;
  const dy = ty - node.y;
  const s = 1 / Math.hypot(dx / node.rx, dy / node.ry);
  return [node.x + dx * s, node.y + dy * s];
}

/** Pull a path tip back toward its control point so the arrowhead clears the node. */
function retract(x, y, cx, cy) {
  const d = Math.hypot(cx - x, cy - y) || 1;
  return [x + ((cx - x) / d) * ARROW_GAP, y + ((cy - y) / d) * ARROW_GAP];
}

/** A quadratic bezier from a to b, bowed sideways by `curve` pixels. */
function bezier(a, b, curve) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const cx = (a.x + b.x) / 2 - ((b.y - a.y) / len) * curve;
  const cy = (a.y + b.y) / 2 + ((b.x - a.x) / len) * curve;

  const [x0, y0] = boundary(a, cx, cy);
  const [x2, y2] = retract(...boundary(b, cx, cy), cx, cy);

  return {
    d: `M${r(x0)},${r(y0)} Q${r(cx)},${r(cy)} ${r(x2)},${r(y2)}`,
    labelX: 0.25 * x0 + 0.5 * cx + 0.25 * x2,
    labelY: 0.25 * y0 + 0.5 * cy + 0.25 * y2,
    extent: [[x0, y0], [x2, y2], [cx, cy]]
  };
}

/** A cubic loop leaving and re-entering the node, bulging away from the graph centre. */
function selfLoop(node, angle) {
  const spread = Math.PI / 3;
  const [x0, y0] = boundary(node, node.x + Math.cos(angle - spread), node.y + Math.sin(angle - spread));
  const [x3, y3] = boundary(node, node.x + Math.cos(angle + spread), node.y + Math.sin(angle + spread));

  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const px = -uy;
  const py = ux;

  const c1x = node.x + ux * LOOP_R - px * LOOP_R * 0.8;
  const c1y = node.y + uy * LOOP_R - py * LOOP_R * 0.8;
  const c2x = node.x + ux * LOOP_R + px * LOOP_R * 0.8;
  const c2y = node.y + uy * LOOP_R + py * LOOP_R * 0.8;

  const [tipX, tipY] = retract(x3, y3, c2x, c2y);

  return {
    d: `M${r(x0)},${r(y0)} C${r(c1x)},${r(c1y)} ${r(c2x)},${r(c2y)} ${r(tipX)},${r(tipY)}`,
    labelX: 0.125 * x0 + 0.375 * c1x + 0.375 * c2x + 0.125 * tipX,
    labelY: 0.125 * y0 + 0.375 * c1y + 0.375 * c2y + 0.125 * tipY,
    extent: [[c1x, c1y], [c2x, c2y]]
  };
}

class Bounds {
  constructor() {
    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
  }

  add(x, y) {
    this.minX = Math.min(this.minX, x);
    this.minY = Math.min(this.minY, y);
    this.maxX = Math.max(this.maxX, x);
    this.maxY = Math.max(this.maxY, y);
    return this;
  }
}

/* ---------------------------------------------------------------- helpers */

const statusClass = (kind) => (kind ? `is-${kind}` : '');
const splitList = (v) => (v || '').split(/[,\s]+/).filter(Boolean);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const r = (n) => Math.round(n * 10) / 10;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (s) => String(s).replace(/[&<>]/g, (c) => ESC[c]);
const escapeAttr = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);
const attrSel = (s) => String(s).replace(/["\\]/g, '\\$&');

customElements.define('blog-turing-machine', BlogTuringMachine);

export default BlogTuringMachine;
