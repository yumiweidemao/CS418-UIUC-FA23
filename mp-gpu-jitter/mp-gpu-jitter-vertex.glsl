#version 300 es

layout(location=0) in vec4 position;
layout(location=1) in vec4 color;

uniform float seconds;
uniform mat4 uniMat; // uniform matrix passed from JS

out vec4 vColor;

void main() {
    vColor = color;
    float jitterAmount = 0.09;
    float id = float(gl_VertexID);
    float multiplier = (gl_VertexID < 6) ? 1.0 : -1.0;
    vec4 tr = vec4(
        jitterAmount*sin(0.9*id*seconds)*multiplier,
        jitterAmount*cos(0.9*id*seconds)*multiplier,
        0.0,
        0.0
    );
    gl_Position = uniMat * (position+tr);
}
