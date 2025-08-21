/**Article 3 */
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

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

/**
 * Creates an optimized full-screen quad VAO using indexed drawing
 *
 * Instead of duplicating vertices, we define 4 unique vertices and use
 * indices to specify which vertices form our two triangles.
 * This reduces memory usage and is more efficient.
 *
 * @param {WebGL2RenderingContext} gl
 * @returns {WebGLVertexArrayObject}
 */
function createFullScreenQuad(gl) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Define only the 4 unique vertices of our quad
    const positions = new Float32Array([
        -1,
        -1, // 0: Bottom left
        1,
        -1, // 1: Bottom right
        -1,
        1, // 2: Top left
        1,
        1, // 3: Top right
    ]);

    // Define indices - which vertices form each triangle
    const indices = new Uint16Array([
        0,
        1,
        2, // First triangle
        2,
        1,
        3, // Second triangle
    ]);

    // Create and bind the position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Set up the position attribute
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Create and bind the index buffer
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    return vao;
}

/**
 * Creates a texture and framebuffer for off-screen rendering
 * @param {WebGL2RenderingContext} gl
 * @returns {{texture: WebGLTexture, framebuffer: WebGLFramebuffer}}
 */
function createFramebuffer(gl) {
    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Allocate minimal storage - we'll resize before each render
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // Create framebuffer
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    // Attach texture to framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    // Check framebuffer completeness
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`Framebuffer is not complete: ${status}`);
    }

    // Unbind
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { texture, framebuffer };
}

/**
 * Main application
 */
async function main() {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl2');

    if (!gl) {
        document.body.innerHTML = '<div class="error">WebGL 2 is not supported in your browser.</div>';
        return;
    }

    try {
        const [vertexSource, sceneFragmentSource, postProcessFragmentSource] = await Promise.all([
            loadShader('src/shaders/basic.vert.glsl'),
            loadShader('src/shaders/basic.frag.glsl'),
            loadShader('src/shaders/postprocess.frag.glsl'),
        ]);

        const sceneProgram = createProgram(gl, vertexSource, sceneFragmentSource);
        const postProcessProgram = createProgram(gl, vertexSource, postProcessFragmentSource);

        if (!sceneProgram || !postProcessProgram) {
            throw new Error('Failed to create shader programs');
        }

        const quadVAO = createFullScreenQuad(gl);

        const { texture: sceneTexture, framebuffer } = createFramebuffer(gl);

        const postProcessUniforms = {
            sceneTexture: gl.getUniformLocation(postProcessProgram, 'uSceneTexture'),
            splitPosition: gl.getUniformLocation(postProcessProgram, 'uSplitPosition'),
            enableEffect: gl.getUniformLocation(postProcessProgram, 'uEnableEffect'),
        };

        const effectToggle = document.getElementById('effectToggle');
        const splitSlider = document.getElementById('splitSlider');

        let textureWidth = 1;
        let textureHeight = 1;

        function resize() {
            const displayWidth = canvas.clientWidth;
            const displayHeight = canvas.clientHeight;

            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;
            }
        }

        function render() {
            resize();

            const width = gl.canvas.width;
            const height = gl.canvas.height;

            // --- PASS 1: Render scene to framebuffer ---

            // Bind framebuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

            // Resize texture if needed
            if (width !== textureWidth || height !== textureHeight) {
                gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                textureWidth = width;
                textureHeight = height;
            }

            // Set viewport and clear
            gl.viewport(0, 0, width, height);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Render scene
            gl.useProgram(sceneProgram);
            gl.bindVertexArray(quadVAO);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

            // --- PASS 2: Render to screen with post-processing ---

            // Unbind framebuffer (render to canvas)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            // Set viewport
            gl.viewport(0, 0, width, height);

            // Use post-process shader
            gl.useProgram(postProcessProgram);

            // Set uniforms
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
            gl.uniform1i(postProcessUniforms.sceneTexture, 0);
            gl.uniform1f(postProcessUniforms.splitPosition, splitSlider.value / 100);
            gl.uniform1i(postProcessUniforms.enableEffect, effectToggle.checked ? 1 : 0);

            // Render quad
            gl.bindVertexArray(quadVAO);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

            requestAnimationFrame(render);
        }

        requestAnimationFrame(render);
    } catch (error) {
        console.error('Initialization error:', error);
        document.body.innerHTML = `<div class="error">Failed to initialize: ${error.message}</div>`;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
