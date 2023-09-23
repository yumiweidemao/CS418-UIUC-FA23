#version 300 es

layout(location=0) in vec4 position;
layout(location=1) in vec4 color;

uniform float seconds;

out vec4 vColor;

void main() {
    vColor = color;

    // Zoom
    float scaledCos = 1.0 - (0.5 * cos(seconds * 1.8) + 0.5) * (0.5 * cos(seconds * 1.8) + 0.5);
    float zoomFactor = 0.6 * scaledCos + 0.4;
    vec2 zoomedPosition = position.xy * zoomFactor;
    
    // Rotate
    vec2 rotatedPosition = zoomedPosition;
    float t = seconds;
    rotatedPosition.x = 0.6*(zoomedPosition.x * cos(t) - zoomedPosition.y * sin(t));
    rotatedPosition.y = 0.6*(zoomedPosition.x * sin(t) + zoomedPosition.y * cos(t));

    // Translate
    vec2 translation = vec2(
        0.3*sin(0.5*t),
        0.3*cos(0.5*t)
    );
    vec2 translatedPosition = rotatedPosition + translation;
    
    gl_Position = vec4(
        translatedPosition,
        position.zw
    );
}

