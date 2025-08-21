/* Article 4 */
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
 * @param {number} width
 * @param {number} height
 * @returns {{texture: WebGLTexture, framebuffer: WebGLFramebuffer}}
 */
function createFramebuffer(gl, width, height) {
    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Allocate texture storage
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

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
 * Creates a pair of framebuffers for ping-pong rendering
 * @param {WebGL2RenderingContext} gl
 * @param {number} width
 * @param {number} height
 * @returns {{read: Object, write: Object, swap: Function}}
 */
function createPingPongFramebuffers(gl, width, height) {
    const fboA = createFramebuffer(gl, width, height);
    const fboB = createFramebuffer(gl, width, height);

    return {
        read: fboA,
        write: fboB,
        swap: function () {
            [this.read, this.write] = [this.write, this.read];
        },
    };
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
        // Load shaders
        const [vertexSource, initialSceneSource, feedbackSource, displaySource] = await Promise.all([
            loadShader('src/shaders/basic.vert.glsl'),
            loadShader('src/shaders/initial-scene.frag.glsl'),
            loadShader('src/shaders/feedback.frag.glsl'),
            loadShader('src/shaders/display.frag.glsl'),
        ]);

        // Create shader programs
        const initialSceneProgram = createProgram(gl, vertexSource, initialSceneSource);
        const feedbackProgram = createProgram(gl, vertexSource, feedbackSource);
        const displayProgram = createProgram(gl, vertexSource, displaySource);

        if (!initialSceneProgram || !feedbackProgram || !displayProgram) {
            throw new Error('Failed to create shader programs');
        }

        // Create geometry
        const quadVAO = createFullScreenQuad(gl);

        // Create ping-pong framebuffers
        let quantityFboPair = createPingPongFramebuffers(gl, gl.canvas.width, gl.canvas.height);

        // Get uniform locations
        const feedbackUniforms = {
            previousFrame: gl.getUniformLocation(feedbackProgram, 'uPreviousFrame'),
        };

        const displayUniforms = {
            displayTexture: gl.getUniformLocation(displayProgram, 'uDisplayTexture'),
        };

        // Initialize: Draw the initial scene once
        function initializeScene() {
            gl.bindFramebuffer(gl.FRAMEBUFFER, quantityFboPair.read.framebuffer);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(initialSceneProgram);
            gl.bindVertexArray(quadVAO);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        initializeScene();

        function resize() {
            const displayWidth = canvas.clientWidth;
            const displayHeight = canvas.clientHeight;

            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;

                // Recreate framebuffers with new size
                quantityFboPair = createPingPongFramebuffers(gl, displayWidth, displayHeight);

                // Reinitialize the scene
                initializeScene();
            }
        }

        function render() {
            resize();

            // --- Feedback Pass: Read from 'read', write to 'write' ---
            gl.bindFramebuffer(gl.FRAMEBUFFER, quantityFboPair.write.framebuffer);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            gl.useProgram(feedbackProgram);

            // Bind the 'read' texture as input
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, quantityFboPair.read.texture);
            gl.uniform1i(feedbackUniforms.previousFrame, 0);

            gl.bindVertexArray(quadVAO);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

            // --- Display Pass: Render result to screen ---
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            gl.useProgram(displayProgram);

            // Display the texture we just wrote to
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, quantityFboPair.write.texture);
            gl.uniform1i(displayUniforms.displayTexture, 0);

            gl.bindVertexArray(quadVAO);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

            // Swap for next frame
            quantityFboPair.swap();

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
