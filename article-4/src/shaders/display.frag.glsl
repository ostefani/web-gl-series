#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform sampler2D uDisplayTexture;

void main() {
    outColor = texture(uDisplayTexture, vUV);
}
