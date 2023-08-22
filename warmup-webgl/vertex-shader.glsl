#version 300 es
uniform float seconds;
uniform int count;
void main() {
    float rad = sqrt((float(gl_VertexID)+0.5)/float(count));
    float ang = 2.399963229728653 * float(gl_VertexID) + seconds;
    gl_Position = vec4(rad*cos(ang), rad*sin(ang), 0, 1);
    gl_PointSize = 4.0;
}
