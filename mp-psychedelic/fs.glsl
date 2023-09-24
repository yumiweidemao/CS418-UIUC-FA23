#version 300 es
precision highp float;

uniform float seconds;

in vec4 vPosition;
out vec4 color;

void main() {
    float x = vPosition.x;
    float y = vPosition.y;
    float t = seconds * 2.0;

    x += 0.3 * sin(t) * x * x + 0.2 * cos(0.5 * t) * x;
    x += 0.2 * sin(2.0 * t) * x * x + 0.1 * cos(3.0 * t) * x;
    x += 0.15 * sin(4.0 * t) * x + 0.15 * cos(2.5 * t) * x;

    y += 0.3 * cos(t) * y * y + 0.2 * sin(0.5 * t) * y;
    y += 0.2 * cos(2.0 * t) * y * y + 0.1 * sin(3.0 * t) * y;
    y += 0.15 * cos(4.0 * t) * y + 0.15 * sin(2.5 * t) * y;

    float r = 1.5*sqrt(x*x + y*y);

    float c = sin(4.0 * r - 2.0 * t) + 0.5 * sin(6.0 * r - 1.5 * t) + 0.4 * sin(7.0 * r - t);
    float s = cos(4.0 * r + t) + 0.5 * cos(6.0 * r + 2.0 * t) + 0.4 * cos(7.0 * r + 1.5 * t);

    float rColor = (sin(1.3 * t + 2.0 * c) + sin(1.4 * t + 1.0 * c) + 2.0) / 4.0;
    float gColor = (cos(t + 1.2 * s) + cos(0.9 * t + 0.5 * c) + 2.0) / 4.0;
    float bColor = (sin(0.8 * t + 1.5 * c) + cos(2.0 * t + 2.5 * s) + 2.0) / 4.0;

    color = vec4(rColor, gColor, bColor, 1.0);
}
