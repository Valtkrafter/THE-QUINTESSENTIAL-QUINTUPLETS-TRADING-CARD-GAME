// A flash over the whole screen, a little brighter in the middle. Drawn additively on top of everything.

varying vec2 vUv;

uniform vec3 uColor;
uniform float uAlpha;

void main() {
  float d = length(vUv - 0.5) * 1.4;
  float a = uAlpha * (0.6 + 0.4 * (1.0 - d));
  gl_FragColor = vec4(uColor * a, 1.0);
}
