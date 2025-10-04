#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform sampler2D uQuantity;
uniform sampler2D uVelocity;
uniform float uDt;
uniform vec2 uTexelSize;
uniform float uDissipation;

void main() {
    // Sample the velocity field at the current pixel's position
    vec2 velocity = texture(uVelocity, vUV).rg;

    // Calculate the source position (look back in time)
    // We multiply by texel size because the advection equation is in grid space, not UV space
    vec2 sourceUV = vUV - velocity * uDt * uTexelSize;

    // Sample the quantity from the previous frame at the source position
    vec4 advectedQuantity = texture(uQuantity, sourceUV);

    // Apply dissipation
    outColor = advectedQuantity * uDissipation;
}