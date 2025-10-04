#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

void main() {
    vec2 vL = texture(uVelocity, vUV - vec2(uTexelSize.x, 0.0)).xy;
    vec2 vR = texture(uVelocity, vUV + vec2(uTexelSize.x, 0.0)).xy;
    vec2 vB = texture(uVelocity, vUV - vec2(0.0, uTexelSize.y)).xy;
    vec2 vT = texture(uVelocity, vUV + vec2(0.0, uTexelSize.y)).xy;

    float divergence = 0.5 * ((vR.x - vL.x) + (vT.y - vB.y));

    outColor = vec4(divergence, 0.0, 0.0, 1.0);
}