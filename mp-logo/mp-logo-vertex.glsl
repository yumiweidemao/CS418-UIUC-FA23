#version 300 es

layout(location=0) in vec4 position;
layout(location=1) in vec4 color;

uniform float seconds;

out vec4 vColor;

void main() {
    vColor = color;

    // Zoom
    float scaledCos = 1.0 - (0.5 * cos(seconds * 2.5) + 0.5) * (0.5 * cos(seconds * 2.5) + 0.5);
    float zoomFactor = 0.3 * scaledCos + 0.4;
    vec2 zoomedPosition = position.xy * zoomFactor;
    
    // Rotate
    vec2 rotatedPosition = zoomedPosition;
    float t = seconds;
    rotatedPosition.x = 0.6*(zoomedPosition.x * cos(0.5*t) - zoomedPosition.y * sin(0.5*t));
    rotatedPosition.y = 0.6*(zoomedPosition.x * sin(0.5*t) + zoomedPosition.y * cos(0.5*t));

    // Translate
    vec2 translation = vec2(
        0.3*sin(1.2*t),
        0.3*cos(1.2*t)
    );
    vec2 translatedPosition = rotatedPosition + translation;
    
    gl_Position = vec4(
        translatedPosition,
        position.zw
    );
}

