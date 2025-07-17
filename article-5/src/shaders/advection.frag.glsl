#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform sampler2D uQuantity;
uniform sampler2D uVelocity;
uniform float uDt;

void main() {
    // Sample the velocity field at the current pixel's position
    vec2 velocity = texture(uVelocity, vUV).rg;
    
    // IMPORTANT: Unmap from [0, 1] back to [-0.5, 0.5]
    velocity = (velocity - 0.5) * 2.0;
    
    // Calculate the source position (look back in time)
    vec2 sourceUV = vUV - velocity * uDt;
    
    // Clamp to texture boundaries to prevent wrapping artifacts
    sourceUV = clamp(sourceUV, 0.0, 1.0);
    
    // Sample the quantity from the previous frame at the source position
    vec4 advectedQuantity = texture(uQuantity, sourceUV);
    
    // Apply a tiny bit of dissipation for visual effect
    outColor = advectedQuantity * 0.999;
}