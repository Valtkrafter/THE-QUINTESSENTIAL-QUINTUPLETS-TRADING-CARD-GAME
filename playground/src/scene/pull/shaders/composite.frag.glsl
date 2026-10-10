// Puts the glowing background (rendered with bloom into a texture) on the screen. While the star dives into the gate it adds
// a radial blur towards the middle, and colour fringes that grow towards the edges (like a real lens under strain).

varying vec2 vUv;

uniform sampler2D uTexture;
uniform float uBlur;
uniform float uAberration;

void main() {
  vec2 d = vUv - 0.5;
  vec2 fringe = d * uAberration * 0.05;
  if (uBlur < 0.002) {
    vec3 plain = vec3(texture2D(uTexture, vUv + fringe).r, texture2D(uTexture, vUv).g, texture2D(uTexture, vUv - fringe).b);
    gl_FragColor = vec4(plain, 1.0);
    return;
  }
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float t = float(i) / 7.0;
    vec2 offset = -d * uBlur * 0.18 * t;
    sum.r += texture2D(uTexture, vUv + offset + fringe).r;
    sum.g += texture2D(uTexture, vUv + offset).g;
    sum.b += texture2D(uTexture, vUv + offset - fringe).b;
  }
  gl_FragColor = vec4(sum / 8.0, 1.0);
}
