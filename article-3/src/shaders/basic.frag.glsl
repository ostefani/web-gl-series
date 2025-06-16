#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

void main() {
    outColor = vec4(vUV, 0.5, 1.0);
}