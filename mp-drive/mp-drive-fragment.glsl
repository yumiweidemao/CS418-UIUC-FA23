#version 300 es
precision highp float;
uniform vec4 color;

uniform vec3 lightdir;
uniform vec3 lightcolor;
uniform vec3 cameraPosition;

out vec4 fragColor;
in vec3 vnormal;
in vec3 fragPos;

void main() {
    vec3 viewDir = normalize(cameraPosition - fragPos);
    vec3 n = normalize(vnormal);
    float lambert = max(dot(n, lightdir), 0.0);
    vec3 halfway = normalize(lightdir + viewDir);
    float blinn = 0.8*pow(max(dot(n, halfway), 0.0), 80.0);
    fragColor = vec4(
        color.rgb * (lightcolor * lambert)
        +
        (lightcolor * blinn)
    , color.a);
}