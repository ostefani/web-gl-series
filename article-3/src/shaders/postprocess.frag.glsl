#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform sampler2D uSceneTexture;
uniform float uSplitPosition;
uniform bool uEnableEffect;

void main() {
    // Flip the Y coordinate when sampling because the scene was rendered with Y-flipped UVs
    vec2 flippedUV = vec2(vUV.x, 1.0 - vUV.y);
    // Sample the scene texture with the corrected UV coordinates
    vec3 sceneColor = texture(uSceneTexture, flippedUV).rgb;
    
    if (uEnableEffect && vUV.x > uSplitPosition) {
        // Apply grayscale conversion using luminance formula
        float grayscale = dot(sceneColor, vec3(0.299, 0.587, 0.114));
        outColor = vec4(vec3(grayscale), 1.0);
    } else {
        // Pass through original color
        outColor = vec4(sceneColor, 1.0);
    }
}