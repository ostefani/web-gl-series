#version 300 es
precision mediump float;
in vec2 vUV;
out vec4 fragColor;
void main() {
    // Render a simple gradient: red = U, green = V, blue = 0.5
    fragColor = vec4(vUV.x, vUV.y, 0.5, 1.0);
}
