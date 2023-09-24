#version 300 es

out vec4 vPosition;

void main() {
    gl_Position.x = (gl_VertexID == 0 || gl_VertexID == 1 || gl_VertexID == 4) ? -1.0 : 1.0;
    gl_Position.y = (gl_VertexID == 0 || gl_VertexID == 2 || gl_VertexID == 3) ? -1.0 : 1.0;
    gl_Position.z = 0.0;
    gl_Position.w = 1.0;
    vPosition = gl_Position;
}