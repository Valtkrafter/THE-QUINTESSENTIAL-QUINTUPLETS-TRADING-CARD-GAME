// A shock wave: a thin bright ring that grows from the middle to the edge of its plane while it fades.

varying vec2 vUv;

uniform vec3 uColor;
uniform float uProgress;
uniform float uStrength;
uniform float uRainbow;
uniform float uTime;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float d = length(p);
  float r = uProgress;
  float width = mix(0.05, 0.17, uProgress);
  float ring = smoothstep(r - width, r, d) * (1.0 - smoothstep(r, r + width * 0.3, d));
  float fade = (1.0 - uProgress) * (1.0 - uProgress);
  vec3 colour = uColor;
  if (uRainbow > 0.5) {
    colour = 0.45 + 0.55 * (0.5 + 0.5 * cos(TAU * (atan(p.y, p.x) / TAU + uProgress * 0.7 + vec3(0.0, 0.333, 0.667))));
  }
  gl_FragColor = vec4(colour * ring * fade * uStrength, 1.0);
}
