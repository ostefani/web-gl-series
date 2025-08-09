#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

void main() {
    float dist = distance(vUV, vec2(0.5));
    float circle = 1.0 - smoothstep(0.02, 0.21, dist);
    
    // Create smooth transition from orange (center) to green (outer)
    // bandFactor is 0 at center, 1 at outer edge
    float bandFactor = clamp((dist - 0.1) / 0.1, 0.0, 1.0);
    
    vec3 orange = vec3(circle * 1.0, circle * 0.5, circle * 0.1);
    vec3 green = vec3(circle * 0.2, circle * 1.0, circle * 0.3);
    
    vec3 color = mix(orange, green, bandFactor);
    
    outColor = vec4(color, 1.0);
}