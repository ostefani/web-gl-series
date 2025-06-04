#version 300 es
layout(location = 0) in vec2 aPosition;
out vec2 vUV;
void main() {
    // Convert aPosition from [-1,1] to [0,1] range for texture‐style UVs
    vUV = aPosition * 0.5 + 0.5;
    vUV.y = 1.0 - vUV.y;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
