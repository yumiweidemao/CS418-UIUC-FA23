#version 300 es
precision highp float;

in vec4 vColor;

uniform float seconds;

out vec4 fragColor;

void main() {
    // leave color unchanged since we only want motion
    fragColor = vColor;
}

