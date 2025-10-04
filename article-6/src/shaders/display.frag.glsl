#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform sampler2D uDisplayTexture;

void main() {
    vec3 color = texture(uDisplayTexture, vUV).rgb;
    
    // Apply slight tone mapping for better visuals
    color = pow(color, vec3(0.9));
    
    outColor = vec4(color, 1.0);
}