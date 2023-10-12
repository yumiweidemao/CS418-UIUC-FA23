#version 300 es
precision highp float;
uniform vec4 color;
uniform vec4 color2;

uniform vec3 lightdir;
uniform vec3 lightcolor;
uniform vec3 halfway;

out vec4 fragColor;
in vec3 vnormal;
in vec3 normal2;
void main() {
    vec3 n = normalize(vnormal);
    vec4 c = normal2.y > 0.6 ? color : color2;
    float lambert = max(dot(n, lightdir), 0.0);
    float blinn = normal2.y > 0.6 ? 2.0*pow(max(dot(n, halfway), 0.0), 180.0) : 0.8*pow(max(dot(n, halfway), 0.0), 16.0);
    fragColor = vec4(
        c.rgb * (lightcolor * lambert)
        +
        (lightcolor * blinn)
    , c.a);
}