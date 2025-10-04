#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform sampler2D uVelocity;
uniform sampler2D uPressure;
uniform vec2 uTexelSize;

void main() {
    vec2 velocity = texture(uVelocity, vUV).xy;

    float pL = texture(uPressure, vUV - vec2(uTexelSize.x, 0.0)).r;
    float pR = texture(uPressure, vUV + vec2(uTexelSize.x, 0.0)).r;
    float pB = texture(uPressure, vUV - vec2(0.0, uTexelSize.y)).r;
    float pT = texture(uPressure, vUV + vec2(0.0, uTexelSize.y)).r;

    vec2 gradient = 0.5 * vec2(pR - pL, pT - pB);
    
    velocity -= gradient;

    outColor = vec4(velocity, 0.0, 1.0);
}