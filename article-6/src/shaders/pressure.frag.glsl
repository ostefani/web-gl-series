#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;

void main() {
    float pL = texture(uPressure, vUV - vec2(uTexelSize.x, 0.0)).r;
    float pR = texture(uPressure, vUV + vec2(uTexelSize.x, 0.0)).r;
    float pB = texture(uPressure, vUV - vec2(0.0, uTexelSize.y)).r;
    float pT = texture(uPressure, vUV + vec2(0.0, uTexelSize.y)).r;

    float divergence = texture(uDivergence, vUV).r;
    
    float newPressure = (pL + pR + pB + pT - divergence) * 0.25;
    
    outColor = vec4(newPressure, 0.0, 0.0, 1.0);
}