#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

void main() {
    float dist = distance(vUV, vec2(0.5));
    float circle = 1.0 - smoothstep(0.2, 0.21, dist);
    outColor = vec4(circle * 1.0, circle * 0.5, circle * 0.1, 1.0);
}