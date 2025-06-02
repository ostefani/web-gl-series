#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUV;
void main() {
    // Convert aPos from [-1,1] to [0,1] range for texture‐style UVs
    vUV = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
