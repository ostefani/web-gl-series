import { setupInputHandlers } from './helpers.js';
import { revealTitle } from './title-reveal.js';

const WEBGL2_SUPPORT_ERROR = 'WebGL 2 is not supported.';
const EXT_SUPPORT_ERROR = 'EXT_color_buffer_float is not supported.';
const DURATION = 6.7;
const D = DURATION / 2;

const UNIFORMS = {
    advection: ['uQuantity', 'uVelocity', 'uDt', 'uTexelSize', 'uDissipation'],
    splat: ['uTarget', 'uAspectRatio', 'uPoint', 'uColor', 'uRadius'],
    divergence: ['uVelocity', 'uTexelSize'],
    pressure: ['uPressure', 'uDivergence', 'uTexelSize'],
    gradient: ['uPressure', 'uVelocity', 'uTexelSize'],
    display: ['uDisplayTexture'],
};

/**
 * Fetches and loads a shader source file
 * @param {string} url - Path to the shader file
 * @returns {Promise<string>} The shader source code
 */
async function loadShader(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load shader: ${url}`);
    }
    return response.text();
}

/**
 * Creates and compiles a shader
 * @param {WebGL2RenderingContext} gl
 * @param {number} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} source - GLSL source code
 * @returns {WebGLShader}
 */
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

/**
 * Creates a shader program from vertex and fragment shaders
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertexSource
 * @param {string} fragmentSource
 * @returns {WebGLProgram}
 */
function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
        return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Check link status FIRST
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        return null;
    }

    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
}

/**
 * Creates a full-screen quad VAO
 * @param {WebGL2RenderingContext} gl
 * @returns {WebGLVertexArrayObject}
 */
function createFullScreenQuad(gl) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return vao;
}

/**
 * Creates a texture and framebuffer for off-screen rendering
 * @param {WebGL2RenderingContext} gl
 * @param {number} width
 * @param {number} height
 * @param {number} internalFormat
 * @param {number} format
 * @param {number} type
 * @returns {{texture: WebGLTexture, framebuffer: WebGLFramebuffer}}
 */
function createFramebuffer(gl, width, height, internalFormat, format, type) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`Framebuffer is not complete: ${status}`);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { texture, framebuffer, width, height };
}

/**
 * Creates a pair of framebuffers for ping-pong rendering
 * @param {WebGL2RenderingContext} gl
 * @param {number} width
 * @param {number} height
 * @param {number} internalFormat
 * @param {number} format
 * @param {number} type
 * @returns {{read: Object, write: Object, swap: Function}}
 */
function createPingPongFramebuffers(gl, width, height, internalFormat, format, type) {
    const fboA = createFramebuffer(gl, width, height, internalFormat, format, type);
    const fboB = createFramebuffer(gl, width, height, internalFormat, format, type);

    return {
        read: fboA,
        write: fboB,
        swap: function () {
            [this.read, this.write] = [this.write, this.read];
        },
    };
}

/**
 * Creates a map of uniform locations from a WebGL program.
 * Automatically strips optional 'u' prefix and converts to camelCase keys.
 *
 * @param {WebGL2RenderingContext} gl - The WebGL rendering context
 * @param {WebGLProgram} program - The compiled and linked shader program
 * @param {string[]} names - Array of uniform names as they appear in the shader
 * @returns {Object.<string, WebGLUniformLocation|null>} Map of camelCase keys to uniform locations
 */
function getUniformMap(gl, program, names) {
    const out = {};
    for (const name of names) {
        const base = name.startsWith('u') ? name.slice(1) : name;
        const key = base.charAt(0).toLowerCase() + base.slice(1);
        const loc = gl.getUniformLocation(program, name);
        out[key] = loc;
    }

    return out;
}

/** Main Application */
async function main() {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl2');

    if (!gl) {
        document.body.innerHTML = `<div class="error">${WEBGL2_SUPPORT_ERROR}</div>`;
        return;
    }
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
        document.body.innerHTML = `<div class="error">${EXT_SUPPORT_ERROR}</div>`;
        return;
    }

    // --- Config ---
    const SIM_RESOLUTION = 128;
    const DYE_RESOLUTION = 512;
    const PRESSURE_ITERATIONS = 20;
    const DT = 0.016;

    const pointer = {
        x: 0.65 * canvas.width,
        y: 0.5 * canvas.height,
        dx: 0,
        dy: 0,
        isDown: false,
        autoAnimation: true,
    };

    try {
        // --- Load Shaders ---
        const [
            vertexSource,
            advectionSource,
            splatSource,
            divergenceSource,
            pressureSource,
            gradientSource,
            displaySource,
        ] = await Promise.all([
            loadShader('src/shaders/basic.vert.glsl'),
            loadShader('src/shaders/advection.frag.glsl'),
            loadShader('src/shaders/splat.frag.glsl'),
            loadShader('src/shaders/divergence.frag.glsl'),
            loadShader('src/shaders/pressure.frag.glsl'),
            loadShader('src/shaders/gradient.frag.glsl'),
            loadShader('src/shaders/display.frag.glsl'),
        ]);

        // --- Create Programs ---
        const advectionProgram = createProgram(gl, vertexSource, advectionSource);
        const splatProgram = createProgram(gl, vertexSource, splatSource);
        const divergenceProgram = createProgram(gl, vertexSource, divergenceSource);
        const pressureProgram = createProgram(gl, vertexSource, pressureSource);
        const gradientProgram = createProgram(gl, vertexSource, gradientSource);
        const displayProgram = createProgram(gl, vertexSource, displaySource);

        // --- Create Geometry ---
        const quadVAO = createFullScreenQuad(gl);

        // --- Create Framebuffers ---
        let simWidth, simHeight, dyeWidth, dyeHeight;
        let velocityFboPair, dyeFboPair, divergenceFbo, pressureFboPair;

        function initFramebuffers() {
            const aspectRatio = gl.canvas.width / gl.canvas.height;
            simWidth = SIM_RESOLUTION * aspectRatio;
            simHeight = SIM_RESOLUTION;
            dyeWidth = DYE_RESOLUTION * aspectRatio;
            dyeHeight = DYE_RESOLUTION;

            velocityFboPair = createPingPongFramebuffers(gl, simWidth, simHeight, gl.RG16F, gl.RG, gl.HALF_FLOAT);
            dyeFboPair = createPingPongFramebuffers(gl, dyeWidth, dyeHeight, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
            divergenceFbo = createFramebuffer(gl, simWidth, simHeight, gl.R16F, gl.RED, gl.HALF_FLOAT);
            pressureFboPair = createPingPongFramebuffers(gl, simWidth, simHeight, gl.R16F, gl.RED, gl.HALF_FLOAT);
        }

        const advectionUniforms = getUniformMap(gl, advectionProgram, UNIFORMS.advection);
        const splatUniforms = getUniformMap(gl, splatProgram, UNIFORMS.splat);
        const divergenceUniforms = getUniformMap(gl, divergenceProgram, UNIFORMS.divergence);
        const pressureUniforms = getUniformMap(gl, pressureProgram, UNIFORMS.pressure);
        const gradientUniforms = getUniformMap(gl, gradientProgram, UNIFORMS.gradient);
        const displayUniforms = getUniformMap(gl, displayProgram, UNIFORMS.display);

        setupInputHandlers(canvas, pointer);

        function applySplat(x, y, dx, dy, color, radius) {
            gl.bindVertexArray(quadVAO);
            gl.useProgram(splatProgram);
            gl.uniform1f(splatUniforms.aspectRatio, canvas.width / canvas.height);
            gl.uniform2f(splatUniforms.point, x / canvas.width, 1.0 - y / canvas.height);
            gl.uniform1f(splatUniforms.radius, radius);

            // Splat velocity
            gl.bindFramebuffer(gl.FRAMEBUFFER, velocityFboPair.write.framebuffer);
            gl.viewport(0, 0, simWidth, simHeight);
            gl.uniform1i(splatUniforms.target, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, velocityFboPair.read.texture);
            gl.uniform3f(splatUniforms.color, dx, dy, 0.0);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            velocityFboPair.swap();

            // Splat dye
            gl.bindFramebuffer(gl.FRAMEBUFFER, dyeFboPair.write.framebuffer);
            gl.viewport(0, 0, dyeWidth, dyeHeight);
            gl.uniform1i(splatUniforms.target, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, dyeFboPair.read.texture);
            gl.uniform3f(splatUniforms.color, color.r, color.g, color.b);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            dyeFboPair.swap();
        }
        let animationTime = 0.6;
        // --- Main Render Loop ---
        function render() {
            gl.bindVertexArray(quadVAO);

            if (pointer.autoAnimation) {
                animationTime += 0.015;

                const effectiveTime = animationTime * Math.PI * 0.3;

                if (effectiveTime >= DURATION) {
                    pointer.autoAnimation = false;
                    const logo = document.getElementById('logo');
                    revealTitle(logo);
                }

                // Create motion
                const newX = (0.5 + 0.25 * Math.cos(effectiveTime)) * canvas.width;
                const newY = (0.55 + 0.3 * Math.sin(effectiveTime) * Math.cos(effectiveTime)) * canvas.height;

                // Calculate velocity
                pointer.dx = 6 * (newX - pointer.x);
                pointer.dy = 6 * (newY - pointer.y);
                pointer.x = newX;
                pointer.y = newY;

                const color = { r: 1.0, g: 0.6, b: 0.1 };
                applySplat(pointer.x, pointer.y, pointer.dx, pointer.dy, color, 0.02);
            }

            // --- Handle user input splats ---
            if (pointer.isDown && (pointer.dx !== 0 || pointer.dy !== 0)) {
                const color = { r: 1.0, g: 0.5, b: 0.1 };
                applySplat(pointer.x, pointer.y, pointer.dx, pointer.dy, color, 0.03);
                pointer.dx = 0;
                pointer.dy = 0;
            }

            gl.disable(gl.BLEND);

            // --- Step 1: Advect velocity ---
            gl.bindFramebuffer(gl.FRAMEBUFFER, velocityFboPair.write.framebuffer);
            gl.viewport(0, 0, simWidth, simHeight);
            gl.useProgram(advectionProgram);

            gl.uniform2f(advectionUniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
            gl.uniform1f(advectionUniforms.dt, DT);
            gl.uniform1i(advectionUniforms.velocity, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, velocityFboPair.read.texture);
            gl.uniform1i(advectionUniforms.quantity, 0);
            gl.uniform1f(advectionUniforms.dissipation, 0.995);

            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            velocityFboPair.swap();

            // --- Step 2: Calculate divergence ---
            gl.bindFramebuffer(gl.FRAMEBUFFER, divergenceFbo.framebuffer);
            gl.viewport(0, 0, simWidth, simHeight);
            gl.useProgram(divergenceProgram);
            gl.uniform2f(divergenceUniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
            gl.uniform1i(divergenceUniforms.velocity, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, velocityFboPair.read.texture);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

            // --- Step 3: Solve pressure (Jacobi iterations) ---
            gl.useProgram(pressureProgram);
            gl.uniform2f(pressureUniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
            gl.uniform1i(pressureUniforms.divergence, 1);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, divergenceFbo.texture);

            for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, pressureFboPair.write.framebuffer);
                gl.viewport(0, 0, simWidth, simHeight);
                gl.uniform1i(pressureUniforms.pressure, 0);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, pressureFboPair.read.texture);
                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
                pressureFboPair.swap();
            }

            // --- Step 4: Subtract pressure gradient from velocity ---
            gl.bindFramebuffer(gl.FRAMEBUFFER, velocityFboPair.write.framebuffer);
            gl.viewport(0, 0, simWidth, simHeight);
            gl.useProgram(gradientProgram);
            gl.uniform2f(gradientUniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
            gl.uniform1i(gradientUniforms.pressure, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, pressureFboPair.read.texture);
            gl.uniform1i(gradientUniforms.velocity, 1);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, velocityFboPair.read.texture);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            velocityFboPair.swap();

            // --- Step 5: Advect dye ---
            gl.bindFramebuffer(gl.FRAMEBUFFER, dyeFboPair.write.framebuffer);
            gl.viewport(0, 0, dyeWidth, dyeHeight);
            gl.useProgram(advectionProgram);
            gl.uniform2f(advectionUniforms.texelSize, 1.0 / dyeWidth, 1.0 / dyeHeight);
            gl.uniform1i(advectionUniforms.velocity, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, velocityFboPair.read.texture);
            gl.uniform1i(advectionUniforms.quantity, 1);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, dyeFboPair.read.texture);
            gl.uniform1f(advectionUniforms.dissipation, 0.995);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            dyeFboPair.swap();

            // --- Step 6: Display pass (render to screen) ---
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(displayProgram);
            gl.uniform1i(displayUniforms.displayTexture, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, dyeFboPair.read.texture);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

            requestAnimationFrame(render);
        }

        function resize() {
            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                initFramebuffers();
            }
        }

        // --- Initialization ---
        resize();
        window.addEventListener('resize', resize);

        requestAnimationFrame(render);
    } catch (error) {
        console.error('Initialization error:', error);
        document.body.innerHTML = `<div class="error">Failed to initialize: ${error.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    main();
});
