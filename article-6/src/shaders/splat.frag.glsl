#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform sampler2D uTarget;
uniform float uAspectRatio;
uniform vec2 uPoint; // Mouse position in normalized coordinates [0, 1]
uniform vec3 uColor; // Color/vector to splat
uniform float uRadius;

void main() {
    vec2 p = vUV - uPoint;
    p.x *= uAspectRatio;
    
    float sqDist = dot(p, p);
    float radiusSq = uRadius * uRadius;

    // Gaussian splat falloff
    vec3 splat = exp(-sqDist / radiusSq) * uColor;
    
    vec3 base = texture(uTarget, vUV).rgb;
    
    outColor = vec4(base + splat, 1.0);
}