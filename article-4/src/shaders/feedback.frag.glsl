#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform sampler2D uPreviousFrame;

void main() {
    vec4 previousColor = texture(uPreviousFrame, vUV);
    // Slowly fade the color
    outColor = previousColor * 0.98;
}