#version 300 es
precision highp float;
uniform vec4 color;

uniform vec3 lightdir;
uniform vec3 lightcolor;
uniform vec3 halfway;

out vec4 fragColor;
in vec3 vnormal;
void main() {
    vec3 n = normalize(vnormal);
    float lambert = max(dot(n, lightdir), 0.0) * (1.0 - color.a);
    float blinn = pow(max(dot(n, halfway), 0.0), 120.0) * 3.0 * color.a;
    fragColor = vec4(
        color.rgb * (lightcolor * lambert)
        +
        (lightcolor * blinn)
    , 1.0);
}