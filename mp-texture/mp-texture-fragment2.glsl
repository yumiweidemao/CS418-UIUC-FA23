#version 300 es
precision highp float;
uniform vec4 color;

uniform vec3 lightdir;
uniform vec3 lightcolor;
uniform vec3 halfway;

uniform sampler2D image;

out vec4 fragColor;
in vec3 vnormal;
in vec2 vTexCoord;

void main() {
    vec3 n = normalize(vnormal);
    float lambert = max(dot(n, lightdir), 0.0);
    vec4 texColor = texture(image, vTexCoord);
    fragColor = vec4(
        texColor.rgb * (lambert * lightcolor),
        1.0
    );
}