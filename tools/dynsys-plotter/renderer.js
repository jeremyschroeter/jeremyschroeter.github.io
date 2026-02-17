// renderer.js - WebGL2 GPU-accelerated dynamical systems renderer

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
        if (!this.gl) throw new Error('WebGL2 not supported');
        this.gl.getExtension('EXT_color_buffer_float');

        this.programs = {};
        this.buffers = {};
        this.fbos = {};
        this.textures = {};

        this.options = {
            showVectorField: true,
            showGrid: true,
            showNullclines: false,
            showParticles: true,
            magScale: 0.55,
            fadeFactor: 0.985,
            particleBrightness: 1.0,
        };

        this.currentDxGLSL = '(-y)';
        this.currentDyGLSL = 'x';
        this.currentParamUniforms = '';
        this.shaderValid = false;

        this._init();
    }

    _init() {
        const gl = this.gl;
        gl.disable(gl.DEPTH_TEST);

        // Full-screen triangle vertices (covers entire viewport)
        const triVerts = new Float32Array([-1, -1, 3, -1, -1, 3]);
        this.buffers.fullscreenTri = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.fullscreenTri);
        gl.bufferData(gl.ARRAY_BUFFER, triVerts, gl.STATIC_DRAW);

        // Particle position buffer
        this.buffers.particles = gl.createBuffer();

        // Trajectory buffers (array of {buffer, count, color})
        this.trajectoryBuffers = [];

        // Build non-equation-dependent shaders
        this._buildTrailFadeProgram();
        this._buildParticleProgram();
        this._buildTrajectoryProgram();
        this._buildCompositeProgram();

        // Build equation-dependent shader (default equations)
        this._buildVectorFieldProgram();

        // Create noise texture
        this._createNoiseTexture(512, 512);

        // FBOs created on resize
        this._setupFBOs();
    }

    // --- Shader compilation helpers ---

    _compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const err = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(err);
        }
        return shader;
    }

    _linkProgram(vs, fs) {
        const gl = this.gl;
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            const err = gl.getProgramInfoLog(prog);
            gl.deleteProgram(prog);
            throw new Error(err);
        }
        return prog;
    }

    _buildProgram(vsSource, fsSource) {
        const vs = this._compileShader(this.gl.VERTEX_SHADER, vsSource);
        const fs = this._compileShader(this.gl.FRAGMENT_SHADER, fsSource);
        return this._linkProgram(vs, fs);
    }

    // --- Fullscreen vertex shader (shared) ---

    get _fullscreenVS() {
        return `#version 300 es
        in vec2 a_pos;
        out vec2 v_uv;
        void main() {
            v_uv = a_pos * 0.5 + 0.5;
            gl_Position = vec4(a_pos, 0.0, 1.0);
        }`;
    }

    // --- Vector field program (rebuilt when equations change) ---

    _buildVectorFieldProgram() {
        const fs = `#version 300 es
        precision highp float;
        in vec2 v_uv;
        out vec4 fragColor;

        uniform vec2 u_resolution;
        uniform vec2 u_center;
        uniform float u_zoom; // device pixels per world unit
        uniform float u_time;
        uniform bool u_showVF;
        uniform bool u_showGrid;
        uniform bool u_showNullclines;
        uniform float u_magScale;
        uniform float u_magMax;
        uniform sampler2D u_noise;

        ${this.currentParamUniforms}

        vec2 field(float x, float y, float t) {
            float dx = ${this.currentDxGLSL};
            float dy = ${this.currentDyGLSL};
            return vec2(dx, dy);
        }

        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main() {
            vec2 pixel = gl_FragCoord.xy;
            float x = u_center.x + (pixel.x - u_resolution.x * 0.5) / u_zoom;
            float y = u_center.y + (pixel.y - u_resolution.y * 0.5) / u_zoom;

            vec3 color = vec3(0.035, 0.035, 0.055);

            if (u_showVF) {
                vec2 v = field(x, y, u_time);
                float angle = atan(v.y, v.x);
                float mag = length(v);
                float normMag = pow(clamp(mag / max(u_magMax, 0.0001), 0.0, 1.0), u_magScale);
                float hue = angle / (2.0 * 3.14159265) + 0.5;
                color = hsv2rgb(vec3(hue, 0.6, normMag * 0.55 + 0.1));
            }

            // Grid
            if (u_showGrid) {
                float worldPerPx = 1.0 / u_zoom;
                float logScale = log(200.0 * worldPerPx) / log(10.0);
                float gridMajor = pow(10.0, ceil(logScale));
                float gridMinor = gridMajor * 0.1;

                vec2 gMinor = abs(mod(vec2(x, y) + gridMinor * 0.5, gridMinor) - gridMinor * 0.5);
                float dMinor = min(gMinor.x, gMinor.y);
                float lineMinor = 1.0 - smoothstep(0.0, 1.8 * worldPerPx, dMinor);
                color = mix(color, vec3(0.15), lineMinor * 0.25);

                vec2 gMajor = abs(mod(vec2(x, y) + gridMajor * 0.5, gridMajor) - gridMajor * 0.5);
                float dMajor = min(gMajor.x, gMajor.y);
                float lineMajor = 1.0 - smoothstep(0.0, 1.8 * worldPerPx, dMajor);
                color = mix(color, vec3(0.25), lineMajor * 0.4);

                float axisDist = min(abs(x), abs(y));
                float axisLine = 1.0 - smoothstep(0.0, 2.5 * worldPerPx, axisDist);
                color = mix(color, vec3(0.5), axisLine * 0.6);
            }

            // Nullclines
            if (u_showNullclines) {
                float eps = 1.0 / u_zoom;
                vec2 vC = field(x, y, u_time);
                vec2 vR = field(x + eps, y, u_time);
                vec2 vU = field(x, y + eps, u_time);

                if (vC.x * vR.x < 0.0 || vC.x * vU.x < 0.0) {
                    color = mix(color, vec3(1.0, 0.45, 0.15), 0.85);
                }
                if (vC.y * vR.y < 0.0 || vC.y * vU.y < 0.0) {
                    color = mix(color, vec3(0.2, 0.55, 1.0), 0.85);
                }
            }

            fragColor = vec4(color, 1.0);
        }`;

        try {
            const newProg = this._buildProgram(this._fullscreenVS, fs);
            // Only delete old program after new one compiles successfully
            if (this.programs.vectorField) this.gl.deleteProgram(this.programs.vectorField);
            this.programs.vectorField = newProg;
            this.shaderValid = true;
            return null;
        } catch (e) {
            // Keep old valid shader if new one fails
            return e.message;
        }
    }

    updateEquations(dxGLSL, dyGLSL, paramNames) {
        this.currentDxGLSL = dxGLSL;
        this.currentDyGLSL = dyGLSL;
        this.currentParamUniforms = paramNames.map(n => `uniform float ${n};`).join('\n');
        return this._buildVectorFieldProgram();
    }

    // --- Trail fade program ---

    _buildTrailFadeProgram() {
        const fs = `#version 300 es
        precision highp float;
        in vec2 v_uv;
        out vec4 fragColor;
        uniform sampler2D u_tex;
        uniform float u_fade;
        void main() {
            fragColor = texture(u_tex, v_uv) * u_fade;
        }`;
        this.programs.trailFade = this._buildProgram(this._fullscreenVS, fs);
    }

    // --- Particle rendering program ---

    _buildParticleProgram() {
        const vs = `#version 300 es
        in vec2 a_pos;
        in float a_speed;
        uniform vec2 u_resolution;
        uniform vec2 u_center;
        uniform float u_zoom;
        out float v_speed;
        void main() {
            float cx = (a_pos.x - u_center.x) * u_zoom / (u_resolution.x * 0.5);
            float cy = (a_pos.y - u_center.y) * u_zoom / (u_resolution.y * 0.5);
            gl_Position = vec4(cx, cy, 0.0, 1.0);
            gl_PointSize = 1.5;
            v_speed = a_speed;
        }`;
        const fs = `#version 300 es
        precision highp float;
        in float v_speed;
        out vec4 fragColor;
        uniform float u_brightness;
        void main() {
            float r = length(gl_PointCoord - 0.5) * 2.0;
            if (r > 1.0) discard;
            float alpha = (1.0 - r * r) * v_speed * u_brightness;
            fragColor = vec4(vec3(0.85, 0.92, 1.0) * alpha, alpha);
        }`;
        this.programs.particle = this._buildProgram(vs, fs);
    }

    // --- Trajectory rendering program ---

    _buildTrajectoryProgram() {
        const vs = `#version 300 es
        in vec2 a_pos;
        uniform vec2 u_resolution;
        uniform vec2 u_center;
        uniform float u_zoom;
        void main() {
            float cx = (a_pos.x - u_center.x) * u_zoom / (u_resolution.x * 0.5);
            float cy = (a_pos.y - u_center.y) * u_zoom / (u_resolution.y * 0.5);
            gl_Position = vec4(cx, cy, 0.0, 1.0);
        }`;
        const fs = `#version 300 es
        precision highp float;
        uniform vec3 u_color;
        out vec4 fragColor;
        void main() {
            fragColor = vec4(u_color, 0.9);
        }`;
        this.programs.trajectory = this._buildProgram(vs, fs);
    }

    // --- Composite program (render trail texture to screen) ---

    _buildCompositeProgram() {
        const fs = `#version 300 es
        precision highp float;
        in vec2 v_uv;
        out vec4 fragColor;
        uniform sampler2D u_tex;
        void main() {
            vec4 c = texture(u_tex, v_uv);
            fragColor = vec4(c.rgb, c.a);
        }`;
        this.programs.composite = this._buildProgram(this._fullscreenVS, fs);
    }

    // --- Textures and FBOs ---

    _createNoiseTexture(w, h) {
        const gl = this.gl;
        const data = new Uint8Array(w * h * 4);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 255;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        this.textures.noise = tex;
    }

    _createFBOPair(w, h) {
        const gl = this.gl;
        const create = () => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            return { fbo, tex };
        };
        return [create(), create()];
    }

    _setupFBOs() {
        const gl = this.gl;
        const w = this.canvas.width || 1;
        const h = this.canvas.height || 1;

        // Clean up old FBOs
        if (this.fbos.trail) {
            this.fbos.trail.forEach(f => { gl.deleteFramebuffer(f.fbo); gl.deleteTexture(f.tex); });
        }
        this.fbos.trail = this._createFBOPair(w, h);
        this.trailIdx = 0;
    }

    resize(width, height) {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this._setupFBOs();
    }

    // --- Drawing helpers ---

    _drawFullscreenTri(program) {
        const gl = this.gl;
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.fullscreenTri);
        const loc = gl.getAttribLocation(program, 'a_pos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    _setUniform(prog, name, type, value) {
        const gl = this.gl;
        const loc = gl.getUniformLocation(prog, name);
        if (loc === null) return;
        switch (type) {
            case '1f': gl.uniform1f(loc, value); break;
            case '2f': gl.uniform2f(loc, value[0], value[1]); break;
            case '3f': gl.uniform3f(loc, value[0], value[1], value[2]); break;
            case '1i': gl.uniform1i(loc, value); break;
            case 'bool': gl.uniform1i(loc, value ? 1 : 0); break;
        }
    }

    // --- Render frame ---

    renderFrame(state) {
        const gl = this.gl;
        const { center, zoom, time, particleData, particleCount, trajectories, params } = state;
        const dpr = window.devicePixelRatio || 1;
        const zoomDevice = zoom * dpr;
        const res = [this.canvas.width, this.canvas.height];

        // 1. Render vector field to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, res[0], res[1]);

        if (this.shaderValid && this.programs.vectorField) {
            const p = this.programs.vectorField;
            gl.useProgram(p);
            this._setUniform(p, 'u_resolution', '2f', res);
            this._setUniform(p, 'u_center', '2f', [center.x, center.y]);
            this._setUniform(p, 'u_zoom', '1f', zoomDevice);
            this._setUniform(p, 'u_time', '1f', time);
            this._setUniform(p, 'u_showVF', 'bool', this.options.showVectorField);
            this._setUniform(p, 'u_showGrid', 'bool', this.options.showGrid);
            this._setUniform(p, 'u_showNullclines', 'bool', this.options.showNullclines);
            this._setUniform(p, 'u_magScale', '1f', this.options.magScale);
            this._setUniform(p, 'u_magMax', '1f', state.magMax || 1.0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.textures.noise);
            this._setUniform(p, 'u_noise', '1i', 0);
            if (params) {
                for (const [name, value] of Object.entries(params)) {
                    this._setUniform(p, name, '1f', value);
                }
            }
            this._drawFullscreenTri(p);
        }

        // 2. Particle trail system
        if (this.options.showParticles && particleCount > 0) {
            if (state.paused) {
                // When paused, render particles directly to screen (no trail FBO)
                // so they pan/zoom correctly without screen-space trail bleeding
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, res[0], res[1]);
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                const pPart = this.programs.particle;
                gl.useProgram(pPart);
                this._setUniform(pPart, 'u_resolution', '2f', res);
                this._setUniform(pPart, 'u_center', '2f', [center.x, center.y]);
                this._setUniform(pPart, 'u_zoom', '1f', zoomDevice);
                this._setUniform(pPart, 'u_brightness', '1f', this.options.particleBrightness * 3.0);
                this._setUniform(pPart, 'u_magMax', '1f', state.magMax || 1.0);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.particles);
                gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.DYNAMIC_DRAW);
                const posLoc = gl.getAttribLocation(pPart, 'a_pos');
                const spdLoc = gl.getAttribLocation(pPart, 'a_speed');
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 12, 0);
                if (spdLoc >= 0) {
                    gl.enableVertexAttribArray(spdLoc);
                    gl.vertexAttribPointer(spdLoc, 1, gl.FLOAT, false, 12, 8);
                }
                gl.drawArrays(gl.POINTS, 0, particleCount);
                gl.disable(gl.BLEND);
                // Clear trail FBOs so no stale trails on unpause
                this.clearTrails();
            } else {
                const readFBO = this.fbos.trail[this.trailIdx];
                const writeFBO = this.fbos.trail[1 - this.trailIdx];

                // Fade previous trail into write buffer
                gl.bindFramebuffer(gl.FRAMEBUFFER, writeFBO.fbo);
                gl.viewport(0, 0, res[0], res[1]);
                const pFade = this.programs.trailFade;
                gl.useProgram(pFade);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, readFBO.tex);
                this._setUniform(pFade, 'u_tex', '1i', 0);
                this._setUniform(pFade, 'u_fade', '1f', this.options.fadeFactor);
                this._drawFullscreenTri(pFade);

                // Render particles onto trail buffer
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                const pPart = this.programs.particle;
                gl.useProgram(pPart);
                this._setUniform(pPart, 'u_resolution', '2f', res);
                this._setUniform(pPart, 'u_center', '2f', [center.x, center.y]);
                this._setUniform(pPart, 'u_zoom', '1f', zoomDevice);
                this._setUniform(pPart, 'u_brightness', '1f', this.options.particleBrightness);
                this._setUniform(pPart, 'u_magMax', '1f', state.magMax || 1.0);

                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.particles);
                gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.DYNAMIC_DRAW);
                const posLoc = gl.getAttribLocation(pPart, 'a_pos');
                const spdLoc = gl.getAttribLocation(pPart, 'a_speed');
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 12, 0);
                if (spdLoc >= 0) {
                    gl.enableVertexAttribArray(spdLoc);
                    gl.vertexAttribPointer(spdLoc, 1, gl.FLOAT, false, 12, 8);
                }
                gl.drawArrays(gl.POINTS, 0, particleCount);
                gl.disable(gl.BLEND);

                this.trailIdx = 1 - this.trailIdx;

                // Composite trail onto screen
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, res[0], res[1]);
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                const pComp = this.programs.composite;
                gl.useProgram(pComp);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, writeFBO.tex);
                this._setUniform(pComp, 'u_tex', '1i', 0);
                this._drawFullscreenTri(pComp);
                gl.disable(gl.BLEND);
            }
        }

        // 3. Render trajectories
        if (trajectories && trajectories.length > 0) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            const pTraj = this.programs.trajectory;
            gl.useProgram(pTraj);
            this._setUniform(pTraj, 'u_resolution', '2f', res);
            this._setUniform(pTraj, 'u_center', '2f', [center.x, center.y]);
            this._setUniform(pTraj, 'u_zoom', '1f', zoomDevice);

            for (const traj of trajectories) {
                if (!traj.glBuffer) {
                    traj.glBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, traj.glBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, traj.points, gl.STATIC_DRAW);
                }
                this._setUniform(pTraj, 'u_color', '3f', traj.color);
                gl.bindBuffer(gl.ARRAY_BUFFER, traj.glBuffer);
                const loc = gl.getAttribLocation(pTraj, 'a_pos');
                gl.enableVertexAttribArray(loc);
                gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.LINE_STRIP, 0, traj.count);
            }
            gl.disable(gl.BLEND);
        }
    }

    clearTrails() {
        const gl = this.gl;
        for (const fbo of this.fbos.trail) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fbo);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    deleteTrajectoryBuffer(traj) {
        if (traj.glBuffer) {
            this.gl.deleteBuffer(traj.glBuffer);
            traj.glBuffer = null;
        }
    }
}
