// app.js - Main application: UI, particles, trajectories, zoom/pan

const PRESETS = [
    { name: 'Simple Rotation', dx: '-y', dy: 'x', params: {}, center: [0, 0], zoom: 50 },
    { name: 'Saddle Point', dx: 'x', dy: '-y', params: {}, center: [0, 0], zoom: 50 },
    { name: 'Stable Spiral', dx: '-x - 2*y', dy: 'x - y', params: {}, center: [0, 0], zoom: 50 },
    { name: 'Limit Cycle', dx: '-y + x*(1 - x^2 - y^2)', dy: 'x + y*(1 - x^2 - y^2)', params: {}, center: [0, 0], zoom: 60 },
    { name: 'Van der Pol', dx: 'y', dy: 'mu*(1 - x^2)*y - x', params: { mu: 1.5 }, center: [0, 0], zoom: 40 },
    { name: 'Lotka-Volterra', dx: 'a*x - b*x*y', dy: '-c*y + d*x*y', params: { a: 1.0, b: 0.5, c: 1.0, d: 0.5 }, center: [3, 3], zoom: 40 },
    { name: 'Duffing (unforced)', dx: 'y', dy: '-delta*y - x*(alpha + beta*x^2)', params: { alpha: -1, beta: 1, delta: 0.2 }, center: [0, 0], zoom: 50 },
    { name: 'Pendulum', dx: 'y', dy: '-sin(x) - b*y', params: { b: 0.3 }, center: [0, 0], zoom: 30 },
    { name: 'Dipole Flow', dx: 'x^2 - y^2', dy: '2*x*y', params: {}, center: [0, 0], zoom: 80 },
    { name: 'SIR-like', dx: '-beta*x*y', dy: 'beta*x*y - gamma*y', params: { beta: 0.3, gamma: 0.1 }, center: [3, 3], zoom: 30 },
];

const TRAJ_COLORS = [
    [0.0, 1.0, 0.4], [1.0, 0.85, 0.0], [0.0, 0.85, 1.0],
    [1.0, 0.35, 0.55], [0.6, 0.4, 1.0], [1.0, 0.6, 0.1],
    [0.3, 1.0, 0.85], [1.0, 0.4, 1.0],
];

class App {
    constructor() {
        this.parser = new MathParser();
        this.center = { x: 0, y: 0 };
        this.zoom = 50; // CSS pixels per world unit
        this.time = 0;
        this.paused = false;
        this.timeSpeed = 1.0;

        // Particles
        this.NUM_PARTICLES = 80000;
        this.particles = new Float32Array(this.NUM_PARTICLES * 3); // x, y, speed
        this.particleAges = new Float32Array(this.NUM_PARTICLES);
        this.maxParticleAge = 120; // frames

        // Trajectories
        this.trajectories = [];
        this.trajColorIdx = 0;

        // CPU evaluators
        this.evalDx = (x, y, t) => -y;
        this.evalDy = (x, y, t) => x;
        this.params = {};

        // Mouse state
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragCenterStart = { x: 0, y: 0 };

        // Viewport magnitude normalization
        this.smoothedMagMax = 1.0;

        // FPS
        this.frameCount = 0;
        this.lastFPSTime = performance.now();
        this.fps = 0;
    }

    init() {
        this.glCanvas = document.getElementById('gl-canvas');
        this.overlay = document.getElementById('overlay-canvas');
        this.overlayCtx = this.overlay.getContext('2d');

        this.renderer = new Renderer(this.glCanvas);

        this._setupUI();
        this._setupEvents();
        this._handleResize();
        this._loadPreset(0);
        this._resetParticles();

        requestAnimationFrame(this._animate.bind(this));
    }

    // --- UI setup ---

    _setupUI() {
        // Presets
        const sel = document.getElementById('preset-select');
        PRESETS.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.name;
            sel.appendChild(opt);
        });
        sel.addEventListener('change', () => this._loadPreset(+sel.value));

        // Equation inputs
        document.getElementById('dx-input').addEventListener('input', () => this._onEquationChange());
        document.getElementById('dy-input').addEventListener('input', () => this._onEquationChange());

        // Toggles
        document.getElementById('toggle-vf').addEventListener('change', (e) => {
            this.renderer.options.showVectorField = e.target.checked;
        });
        document.getElementById('toggle-grid').addEventListener('change', (e) => {
            this.renderer.options.showGrid = e.target.checked;
        });
        document.getElementById('toggle-nullclines').addEventListener('change', (e) => {
            this.renderer.options.showNullclines = e.target.checked;
        });
        document.getElementById('toggle-particles').addEventListener('change', (e) => {
            this.renderer.options.showParticles = e.target.checked;
            if (e.target.checked) this.renderer.clearTrails();
        });

        // Sliders
        document.getElementById('mag-scale').addEventListener('input', (e) => {
            this.renderer.options.magScale = +e.target.value;
            document.getElementById('mag-scale-val').textContent = (+e.target.value).toFixed(2);
        });
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            this.timeSpeed = +e.target.value;
            document.getElementById('speed-val').textContent = (+e.target.value).toFixed(1);
        });
        document.getElementById('trail-slider').addEventListener('input', (e) => {
            this.renderer.options.fadeFactor = +e.target.value;
            document.getElementById('trail-val').textContent = (+e.target.value).toFixed(3);
        });
        // Buttons
        document.getElementById('btn-reset-view').addEventListener('click', () => this._resetView());
        document.getElementById('btn-clear-traj').addEventListener('click', () => this._clearTrajectories());
        document.getElementById('btn-pause').addEventListener('click', () => {
            this.paused = !this.paused;
            document.getElementById('btn-pause').textContent = this.paused ? 'Resume' : 'Pause';
        });
    }

    // --- Events ---

    _setupEvents() {
        window.addEventListener('resize', () => this._handleResize());

        const container = document.getElementById('canvas-container');

        // Zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.glCanvas.getBoundingClientRect();
            const cssX = e.clientX - rect.left;
            const cssY = e.clientY - rect.top;

            // World position under cursor (before zoom)
            const wx = this.center.x + (cssX - rect.width / 2) / this.zoom;
            const wy = this.center.y + (rect.height / 2 - cssY) / this.zoom;

            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= factor;
            this.zoom = Math.max(0.0001, Math.min(1e12, this.zoom));

            // Adjust center so world position stays under cursor
            this.center.x = wx - (cssX - rect.width / 2) / this.zoom;
            this.center.y = wy - (rect.height / 2 - cssY) / this.zoom;
        }, { passive: false });

        // Pan
        container.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !e.shiftKey) {
                this.isDragging = true;
                this.dragStart = { x: e.clientX, y: e.clientY };
                this.dragCenterStart = { ...this.center };
                container.style.cursor = 'grabbing';
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.dragStart.x;
                const dy = e.clientY - this.dragStart.y;
                this.center.x = this.dragCenterStart.x - dx / this.zoom;
                this.center.y = this.dragCenterStart.y + dy / this.zoom;
            }
            // Update cursor position display
            const rect = this.glCanvas.getBoundingClientRect();
            const cssX = e.clientX - rect.left;
            const cssY = e.clientY - rect.top;
            if (cssX >= 0 && cssY >= 0 && cssX < rect.width && cssY < rect.height) {
                const wx = this.center.x + (cssX - rect.width / 2) / this.zoom;
                const wy = this.center.y + (rect.height / 2 - cssY) / this.zoom;
                document.getElementById('cursor-pos').textContent =
                    `(${wx.toPrecision(6)}, ${wy.toPrecision(6)})`;
            }
        });
        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            container.style.cursor = 'crosshair';
        });

        // Add trajectory on shift+click
        container.addEventListener('click', (e) => {
            if (e.shiftKey) {
                const rect = this.glCanvas.getBoundingClientRect();
                const cssX = e.clientX - rect.left;
                const cssY = e.clientY - rect.top;
                const wx = this.center.x + (cssX - rect.width / 2) / this.zoom;
                const wy = this.center.y + (rect.height / 2 - cssY) / this.zoom;
                this._addTrajectory(wx, wy);
            }
        });

        // Right click to remove last trajectory
        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.trajectories.length > 0) {
                const traj = this.trajectories.pop();
                this.renderer.deleteTrajectoryBuffer(traj);
            }
        });

        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    this.paused = !this.paused;
                    document.getElementById('btn-pause').textContent = this.paused ? 'Resume' : 'Pause';
                    break;
                case 'r': this._resetView(); break;
                case 'c': this._clearTrajectories(); break;
                case 'g':
                    document.getElementById('toggle-grid').click();
                    break;
                case 'n':
                    document.getElementById('toggle-nullclines').click();
                    break;
                case 'p':
                    document.getElementById('toggle-particles').click();
                    break;
            }
        });

        // Touch support
        let lastTouchDist = 0;
        let lastTouchCenter = { x: 0, y: 0 };
        container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                this.dragCenterStart = { ...this.center };
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDist = Math.sqrt(dx * dx + dy * dy);
                lastTouchCenter = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                };
            }
        }, { passive: false });
        container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.isDragging) {
                const dx = e.touches[0].clientX - this.dragStart.x;
                const dy = e.touches[0].clientY - this.dragStart.y;
                this.center.x = this.dragCenterStart.x - dx / this.zoom;
                this.center.y = this.dragCenterStart.y + dy / this.zoom;
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (lastTouchDist > 0) {
                    const factor = dist / lastTouchDist;
                    const rect = this.glCanvas.getBoundingClientRect();
                    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                    const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
                    const wx = this.center.x + (cx - rect.width / 2) / this.zoom;
                    const wy = this.center.y + (rect.height / 2 - cy) / this.zoom;
                    this.zoom *= factor;
                    this.zoom = Math.max(0.0001, Math.min(1e12, this.zoom));
                    this.center.x = wx - (cx - rect.width / 2) / this.zoom;
                    this.center.y = wy - (rect.height / 2 - cy) / this.zoom;
                }
                lastTouchDist = dist;
            }
        }, { passive: false });
        container.addEventListener('touchend', () => { this.isDragging = false; lastTouchDist = 0; });
    }

    _handleResize() {
        const container = document.getElementById('canvas-container');
        const w = container.clientWidth;
        const h = container.clientHeight;
        this.renderer.resize(w, h);
        this.overlay.width = w * (window.devicePixelRatio || 1);
        this.overlay.height = h * (window.devicePixelRatio || 1);
        this.overlay.style.width = w + 'px';
        this.overlay.style.height = h + 'px';
        this.canvasW = w;
        this.canvasH = h;
    }

    // --- Equations ---

    _onEquationChange() {
        const dxStr = document.getElementById('dx-input').value.trim();
        const dyStr = document.getElementById('dy-input').value.trim();
        const errEl = document.getElementById('eq-error');
        const dxInput = document.getElementById('dx-input');
        const dyInput = document.getElementById('dy-input');

        if (!dxStr || !dyStr) {
            errEl.textContent = '';
            dxInput.classList.remove('error');
            dyInput.classList.remove('error');
            return;
        }

        const dxResult = this.parser.toGLSL(dxStr);
        const dyResult = this.parser.toGLSL(dyStr);

        if (dxResult.error) {
            errEl.textContent = 'dx/dt: ' + dxResult.error;
            dxInput.classList.add('error');
            return;
        }
        if (dyResult.error) {
            errEl.textContent = 'dy/dt: ' + dyResult.error;
            dyInput.classList.add('error');
            return;
        }

        dxInput.classList.remove('error');
        dyInput.classList.remove('error');

        // Merge params
        const allParams = new Map([...dxResult.params, ...dyResult.params]);
        const paramNames = [...allParams.keys()];

        // Update GPU shader
        const shaderErr = this.renderer.updateEquations(dxResult.glsl, dyResult.glsl, paramNames);
        if (shaderErr) {
            errEl.textContent = 'Shader: ' + shaderErr.substring(0, 120);
            return;
        }
        errEl.textContent = '';

        // Update CPU evaluators
        this.evalDx = createEvaluator(dxResult.glsl, paramNames);
        this.evalDy = createEvaluator(dyResult.glsl, paramNames);

        // Update parameter UI
        this._updateParamUI(allParams);

        // Reset particles and trails
        this._resetParticles();
        this.renderer.clearTrails();

        // Recompute trajectories
        this._recomputeTrajectories();
    }

    _updateParamUI(detectedParams) {
        const container = document.getElementById('param-container');

        // Keep existing param values
        for (const [name, defaultVal] of detectedParams) {
            if (!(name in this.params)) {
                this.params[name] = defaultVal;
            }
        }

        // Remove params no longer in equations
        for (const key of Object.keys(this.params)) {
            if (!detectedParams.has(key)) delete this.params[key];
        }

        container.innerHTML = '';
        for (const [name, _] of detectedParams) {
            const row = document.createElement('div');
            row.className = 'param-row';

            const label = document.createElement('label');
            label.textContent = name + ' =';
            label.className = 'param-label';

            const input = document.createElement('input');
            input.type = 'number';
            input.step = '0.1';
            input.value = this.params[name];
            input.className = 'param-input';
            input.addEventListener('input', () => {
                this.params[name] = parseFloat(input.value) || 0;
                this._resetParticles();
                this.renderer.clearTrails();
                this._recomputeTrajectories();
            });

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '-5';
            slider.max = '5';
            slider.step = '0.01';
            slider.value = this.params[name];
            slider.className = 'param-slider';
            slider.addEventListener('input', () => {
                const v = parseFloat(slider.value);
                this.params[name] = v;
                input.value = v.toFixed(2);
                this._resetParticles();
                this.renderer.clearTrails();
                this._recomputeTrajectories();
            });

            row.appendChild(label);
            row.appendChild(input);
            row.appendChild(slider);
            container.appendChild(row);
        }
    }

    _loadPreset(idx) {
        const p = PRESETS[idx];
        document.getElementById('dx-input').value = p.dx;
        document.getElementById('dy-input').value = p.dy;
        this.params = { ...p.params };
        this.center = { x: p.center[0], y: p.center[1] };
        this.zoom = p.zoom;
        this._onEquationChange();
        this._clearTrajectories();
        document.getElementById('preset-select').value = idx;
    }

    _resetView() {
        const sel = document.getElementById('preset-select');
        const p = PRESETS[+sel.value];
        this.center = { x: p.center[0], y: p.center[1] };
        this.zoom = p.zoom;
        this._resetParticles();
        this.renderer.clearTrails();
    }

    // --- Particles ---

    _resetParticles() {
        const rect = this.glCanvas.getBoundingClientRect();
        const hw = (rect.width / 2) / this.zoom;
        const hh = (rect.height / 2) / this.zoom;
        for (let i = 0; i < this.NUM_PARTICLES; i++) {
            this.particles[i * 3] = this.center.x + (Math.random() * 2 - 1) * hw;
            this.particles[i * 3 + 1] = this.center.y + (Math.random() * 2 - 1) * hh;
            const age = Math.random() * this.maxParticleAge;
            this.particleAges[i] = age;
            this.particles[i * 3 + 2] = Math.min((age / this.maxParticleAge) * 5.0, 1.0);
        }
    }

    _updateParticles(dt) {
        const rect = this.glCanvas.getBoundingClientRect();
        const hw = (rect.width / 2) / this.zoom * 3;
        const hh = (rect.height / 2) / this.zoom * 3;
        const cx = this.center.x, cy = this.center.y;
        const p = this.params;
        const t = this.time;

        for (let i = 0; i < this.NUM_PARTICLES; i++) {
            const idx = i * 3;
            let x = this.particles[idx];
            let y = this.particles[idx + 1];
            this.particleAges[i] += 1;

            // Check bounds and age
            const outOfBounds = Math.abs(x - cx) > hw || Math.abs(y - cy) > hh;
            if (outOfBounds || this.particleAges[i] > this.maxParticleAge || !isFinite(x) || !isFinite(y)) {
                x = cx + (Math.random() * 2 - 1) * hw;
                y = cy + (Math.random() * 2 - 1) * hh;
                this.particleAges[i] = 0;
                this.particles[idx] = x;
                this.particles[idx + 1] = y;
                this.particles[idx + 2] = 0; // invisible at birth
                continue;
            }

            // Age-based visibility: fade in over first 20% of life
            const ageFrac = this.particleAges[i] / this.maxParticleAge;
            const visibility = Math.min(ageFrac * 5.0, 1.0);

            // RK4 integration
            try {
                const k1x = this.evalDx(x, y, t, p);
                const k1y = this.evalDy(x, y, t, p);
                const k2x = this.evalDx(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, t, p);
                const k2y = this.evalDy(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, t, p);
                const k3x = this.evalDx(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, t, p);
                const k3y = this.evalDy(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, t, p);
                const k4x = this.evalDx(x + dt * k3x, y + dt * k3y, t, p);
                const k4y = this.evalDy(x + dt * k3x, y + dt * k3y, t, p);

                const dx = (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
                const dy = (k1y + 2 * k2y + 2 * k3y + k4y) / 6;

                this.particles[idx] = x + dx * dt;
                this.particles[idx + 1] = y + dy * dt;
                this.particles[idx + 2] = visibility;
            } catch (_) {
                this.particles[idx + 2] = 0;
            }
        }
    }

    // --- Trajectories ---

    _addTrajectory(x0, y0) {
        const steps = 30000;
        const dt = 0.005;
        const points = new Float32Array((steps + 1) * 2);
        const p = this.params;
        const t = this.time;

        let count = 0;

        // Forward integration only (drop a particle)
        let x = x0, y = y0;
        for (let i = 0; i < steps; i++) {
            if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) break;
            points[count * 2] = x;
            points[count * 2 + 1] = y;
            count++;
            const k1x = this.evalDx(x, y, t, p);
            const k1y = this.evalDy(x, y, t, p);
            const k2x = this.evalDx(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, t, p);
            const k2y = this.evalDy(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, t, p);
            const k3x = this.evalDx(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, t, p);
            const k3y = this.evalDy(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, t, p);
            const k4x = this.evalDx(x + dt * k3x, y + dt * k3y, t, p);
            const k4y = this.evalDy(x + dt * k3x, y + dt * k3y, t, p);
            const dx = (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
            const dy = (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
            x += dx * dt;
            y += dy * dt;
        }

        const color = TRAJ_COLORS[this.trajColorIdx % TRAJ_COLORS.length];
        this.trajColorIdx++;

        this.trajectories.push({
            points: points.subarray(0, count * 2),
            count,
            color,
            x0, y0,
            glBuffer: null,
        });
    }

    _recomputeTrajectories() {
        const origins = this.trajectories.map(t => ({ x0: t.x0, y0: t.y0 }));
        this._clearTrajectories();
        for (const { x0, y0 } of origins) {
            this._addTrajectory(x0, y0);
        }
    }

    _clearTrajectories() {
        for (const traj of this.trajectories) this.renderer.deleteTrajectoryBuffer(traj);
        this.trajectories = [];
        this.trajColorIdx = 0;
    }

    // --- Viewport magnitude sampling ---

    _sampleViewportMagnitudes() {
        const rect = this.glCanvas.getBoundingClientRect();
        const hw = (rect.width / 2) / this.zoom;
        const hh = (rect.height / 2) / this.zoom;
        const N = 20;
        const p = this.params;
        const t = this.time;
        let maxMag = 0;

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                const x = this.center.x + ((i / (N - 1)) * 2 - 1) * hw;
                const y = this.center.y + ((j / (N - 1)) * 2 - 1) * hh;
                try {
                    const dx = this.evalDx(x, y, t, p);
                    const dy = this.evalDy(x, y, t, p);
                    const mag = Math.sqrt(dx * dx + dy * dy);
                    if (isFinite(mag)) maxMag = Math.max(maxMag, mag);
                } catch (_) {}
            }
        }
        return maxMag || 1.0;
    }

    // --- Overlay (grid labels, info) ---

    _renderOverlay() {
        const ctx = this.overlayCtx;
        const dpr = window.devicePixelRatio || 1;
        const w = this.overlay.width;
        const h = this.overlay.height;
        ctx.clearRect(0, 0, w, h);

        if (!this.renderer.options.showGrid) return;

        ctx.save();
        ctx.scale(dpr, dpr);
        const cw = this.canvasW;
        const ch = this.canvasH;

        // Compute grid spacing
        const worldPerPx = 1 / this.zoom;
        const logScale = Math.log10(200 * worldPerPx);
        const gridMajor = Math.pow(10, Math.ceil(logScale));

        // Draw labels at major grid intersections
        ctx.font = '11px "SF Mono", "Fira Code", monospace';
        ctx.fillStyle = 'rgba(180, 180, 200, 0.6)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const xMin = this.center.x - cw / 2 / this.zoom;
        const xMax = this.center.x + cw / 2 / this.zoom;
        const yMin = this.center.y - ch / 2 / this.zoom;
        const yMax = this.center.y + ch / 2 / this.zoom;

        const startX = Math.floor(xMin / gridMajor) * gridMajor;
        const startY = Math.floor(yMin / gridMajor) * gridMajor;

        // X axis labels
        for (let gx = startX; gx <= xMax; gx += gridMajor) {
            const px = (gx - this.center.x) * this.zoom + cw / 2;
            if (px < 20 || px > cw - 20) continue;
            // Position near x-axis (world y=0 in screen coords)
            const axisScreenY = ch / 2 + this.center.y * this.zoom;
            let labelY = Math.min(Math.max(axisScreenY + 4, 2), ch - 16);
            const val = Math.abs(gx) < gridMajor * 1e-9 ? 0 : gx;
            ctx.fillText(formatNum(val), px, labelY);
        }

        // Y axis labels
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (let gy = startY; gy <= yMax; gy += gridMajor) {
            const py = ch / 2 - (gy - this.center.y) * this.zoom;
            if (py < 10 || py > ch - 10) continue;
            // Position near y-axis (world x=0 in screen coords)
            const axisScreenX = cw / 2 - this.center.x * this.zoom;
            let labelX = Math.min(Math.max(axisScreenX + 4, 2), cw - 40);
            const val = Math.abs(gy) < gridMajor * 1e-9 ? 0 : gy;
            if (Math.abs(val) < gridMajor * 1e-9) continue; // Skip 0 on y (already shown on x)
            ctx.fillText(formatNum(val), labelX, py);
        }

        ctx.restore();
    }

    // --- Animation loop ---

    _animate(timestamp) {
        requestAnimationFrame(this._animate.bind(this));

        if (!this.paused) {
            const dt = 0.005 * this.timeSpeed;
            this.time += dt;
            this._updateParticles(dt);
        }

        // Sample viewport magnitudes and smooth (asymmetric: fast decrease, slow increase)
        const sampledMax = this._sampleViewportMagnitudes();
        if (sampledMax < this.smoothedMagMax) {
            this.smoothedMagMax += (sampledMax - this.smoothedMagMax) * 0.5;
        } else {
            this.smoothedMagMax += (sampledMax - this.smoothedMagMax) * 0.15;
        }

        this.renderer.renderFrame({
            center: this.center,
            zoom: this.zoom,
            time: this.time,
            paused: this.paused,
            particleData: this.particles,
            particleCount: this.NUM_PARTICLES,
            trajectories: this.trajectories,
            params: this.params,
            magMax: this.smoothedMagMax,
        });

        this._renderOverlay();

        // FPS counter
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFPSTime > 500) {
            this.fps = Math.round(this.frameCount / (now - this.lastFPSTime) * 1000);
            this.frameCount = 0;
            this.lastFPSTime = now;
            document.getElementById('fps').textContent = this.fps + ' FPS';
            document.getElementById('zoom-level').textContent = 'Zoom: ' + formatZoom(this.zoom);
        }
    }
}

// --- Utilities ---

function formatNum(v) {
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1e6 || abs < 0.001) return v.toExponential(1);
    if (abs >= 100) return v.toFixed(0);
    if (abs >= 1) return v.toFixed(1);
    return v.toPrecision(3);
}

function formatZoom(z) {
    if (z >= 1e6) return z.toExponential(1) + 'x';
    if (z >= 1000) return (z / 1000).toFixed(1) + 'kx';
    if (z >= 1) return z.toFixed(1) + 'x';
    return z.toExponential(1) + 'x';
}

// --- Start ---

window.addEventListener('DOMContentLoaded', () => {
    new App().init();
});
