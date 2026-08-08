/**
 * <blog-mp-net> Component
 * McCulloch-Pitts logic-gate networks, drawn in their classic notation:
 * each neuron is a triangle labelled with its threshold, excitatory synapses
 * are filled dots, and an inhibitory synapse is a hollow ring that vetoes its
 * target (in the true MP model any active inhibitory input nullifies the cell).
 *
 * The inputs are clickable. Toggle them and the network computes forward, one
 * layer at a time, lighting up whichever neurons fire — so you can watch a
 * single neuron fail at XOR and a three-neuron network succeed.
 *
 * Usage:
 *   <blog-mp-net type="and"></blog-mp-net>
 *   <blog-mp-net type="xor"></blog-mp-net>
 *   <blog-mp-net type="xor" static></blog-mp-net>   (no interaction)
 *
 * A neuron fires when the sum of its active excitatory inputs (unit weights)
 * strictly exceeds its threshold, unless an inhibitory input vetoes it.
 */

const HW = 30; // triangle half-width
const HH = 26; // triangle half-height

const PRESETS = {
  and: {
    name: 'AND',
    viewBox: [0, 0, 360, 200],
    inputs: ['1', '2'],
    output: '3',
    neurons: [
      { id: '1', kind: 'input', x: 55, y: 55, label: '1' },
      { id: '2', kind: 'input', x: 55, y: 145, label: '2' },
      { id: '3', kind: 'output', x: 250, y: 100, label: '3', theta: 1.5 }
    ],
    edges: [
      { from: '1', to: '3', sign: 1 },
      { from: '2', to: '3', sign: 1 }
    ]
  },

  xor: {
    name: 'XOR',
    viewBox: [0, 0, 460, 250],
    inputs: ['1', '2'],
    output: 'out',
    neurons: [
      { id: '1', kind: 'input', x: 55, y: 70, label: '1' },
      { id: '2', kind: 'input', x: 55, y: 180, label: '2' },
      { id: 'or', kind: 'hidden', x: 215, y: 55, label: 'OR', theta: 0.5 },
      { id: 'and', kind: 'hidden', x: 215, y: 195, label: 'AND', theta: 1.5 },
      { id: 'out', kind: 'output', x: 380, y: 125, label: 'XOR', theta: 0.5 }
    ],
    edges: [
      { from: '1', to: 'or', sign: 1 },
      { from: '2', to: 'or', sign: 1 },
      { from: '1', to: 'and', sign: 1 },
      { from: '2', to: 'and', sign: 1 },
      { from: 'or', to: 'out', sign: 1 },
      { from: 'and', to: 'out', sign: -1 }
    ]
  }
};

class BlogMpNet extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;

    this.preset = PRESETS[(this.getAttribute('type') || 'and').toLowerCase()];
    if (!this.preset) {
      this.innerHTML = `<div class="mp"><p class="mp-error">Unknown network type.</p></div>`;
      return;
    }

    this.interactive = !this.hasAttribute('static');
    this.byId = new Map(this.preset.neurons.map((n) => [n.id, n]));
    this.incoming = new Map(this.preset.neurons.map((n) => [n.id, []]));
    for (const e of this.preset.edges) this.incoming.get(e.to).push(e);

    // Inputs start at 1 so the diagram opens on a "firing" example.
    this.state = new Map(this.preset.neurons.map((n) => [n.id, n.kind === 'input' ? 1 : 0]));

    this.render();
    this.compute();
  }

  /* --------------------------------------------------------------- geometry */

  /** A right-pointing triangle: flat input side on the left, output apex right. */
  triangle(n) {
    return `${n.x - HW},${n.y - HH} ${n.x - HW},${n.y + HH} ${n.x + HW},${n.y}`;
  }

  /** Where an edge attaches on the target's left face, spread over its inputs. */
  attach(target, edge) {
    const ins = this.incoming.get(target.id);
    const i = ins.indexOf(edge);
    const t = ins.length === 1 ? 0.5 : i / (ins.length - 1);
    return { x: target.x - HW, y: target.y - HH * 0.55 + t * HH * 1.1 };
  }

  edgePath(edge) {
    const a = this.byId.get(edge.from);
    const b = this.byId.get(edge.to);
    const p0 = { x: a.x + HW, y: a.y };
    const p1 = this.attach(b, edge);
    const mx = (p0.x + p1.x) / 2;
    return `M${p0.x},${p0.y} C${mx},${p0.y} ${mx},${p1.y} ${p1.x},${p1.y}`;
  }

  /* ----------------------------------------------------------------- render */

  render() {
    const [, , vw, vh] = this.preset.viewBox;

    let edges = '';
    let synapses = '';
    for (const e of this.preset.edges) {
      const key = `${e.from}-${e.to}`;
      edges += `<path class="mp-edge" data-edge="${key}" d="${this.edgePath(e)}"/>`;

      const p = this.attach(this.byId.get(e.to), e);
      synapses +=
        e.sign > 0
          ? `<circle class="mp-syn mp-exc" data-edge="${key}" cx="${p.x}" cy="${p.y}" r="5"/>`
          : `<circle class="mp-syn mp-inh" data-edge="${key}" cx="${p.x}" cy="${p.y}" r="5"/>`;
    }

    let neurons = '';
    for (const n of this.preset.neurons) {
      const cls = `mp-neuron mp-${n.kind}${this.interactive && n.kind === 'input' ? ' mp-clickable' : ''}`;
      const theta =
        n.theta != null
          ? `<text class="mp-theta" x="${n.x - HW * 0.1}" y="${n.y + HH + 15}">&#952;=${n.theta}</text>`
          : '';
      const stub =
        n.kind === 'output' ? `<line class="mp-stub" x1="${n.x + HW}" y1="${n.y}" x2="${n.x + HW + 34}" y2="${n.y}"/>` : '';
      neurons += `
        <g class="${cls}" data-id="${n.id}">
          ${stub}
          <polygon class="mp-body" points="${this.triangle(n)}"/>
          <text class="mp-label" x="${n.x - HW * 0.18}" y="${n.y}">${n.label}</text>
          ${theta}
        </g>`;
    }

    const hint = this.interactive
      ? `<p class="mp-hint">Click neurons <span class="mp-mono">1</span> and <span class="mp-mono">2</span> to toggle their inputs.</p>`
      : '';

    this.innerHTML = `
      <div class="mp">
        <svg viewBox="0 0 ${vw} ${vh}" role="img"
             aria-label="McCulloch-Pitts network computing ${this.preset.name}">
          ${edges}
          ${synapses}
          ${neurons}
        </svg>
        <div class="mp-readout"></div>
        ${hint}
      </div>
    `;

    if (this.interactive) {
      for (const g of this.querySelectorAll('.mp-clickable')) {
        g.addEventListener('click', () => {
          const id = g.dataset.id;
          this.state.set(id, this.state.get(id) ? 0 : 1);
          this.compute();
        });
      }
    }
  }

  /* ---------------------------------------------------------------- compute */

  compute() {
    // Feed-forward DAG: a couple of passes in listed order settle every layer.
    for (let pass = 0; pass < this.preset.neurons.length; pass++) {
      for (const n of this.preset.neurons) {
        if (n.kind === 'input') continue;
        let inhibited = false;
        let exc = 0;
        for (const e of this.incoming.get(n.id)) {
          if (!this.state.get(e.from)) continue;
          if (e.sign < 0) inhibited = true;
          else exc += 1;
        }
        this.state.set(n.id, !inhibited && exc > n.theta ? 1 : 0);
      }
    }

    this.paint();
  }

  paint() {
    for (const g of this.querySelectorAll('.mp-neuron')) {
      g.classList.toggle('is-on', !!this.state.get(g.dataset.id));
    }
    for (const el of this.querySelectorAll('[data-edge]')) {
      const from = el.dataset.edge.split('-')[0];
      el.classList.toggle('is-active', !!this.state.get(from));
    }

    const { inputs, output, name } = this.preset;
    const bits = inputs.map((id) => this.state.get(id));
    const out = this.state.get(output);
    this.querySelector('.mp-readout').innerHTML =
      `<span class="mp-mono">${bits[0]}</span> ${name} ` +
      `<span class="mp-mono">${bits[1]}</span> = ` +
      `<span class="mp-mono mp-out ${out ? 'is-on' : ''}">${out}</span>`;
  }
}

customElements.define('blog-mp-net', BlogMpNet);

export default BlogMpNet;
