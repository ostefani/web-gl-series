#version 300 es
precision highp float;
in vec2 vUV;
out vec4 outColor;
uniform float uAspectRatio;

void main() {
    // Center the coordinates to (-0.5, 0.5) range
    vec2 centeredUV = vUV - 0.5;
    
    // Account for aspect ratio
    centeredUV.x *= uAspectRatio;
    
    // Calculate the vortex velocity
    float vx = -centeredUV.y;
    float vy = centeredUV.x;

    // Uncomment to convert circular motion vectors back to UV space 
    // vx /= uAspectRatio;
    
    // Store the 2D vector in the R and G channels
    outColor = vec4(vx, vy, 0.0, 1.0);
}