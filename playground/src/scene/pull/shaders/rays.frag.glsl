// Slowly turning rays of light that fan out from the middle of a plane, for the burst and the glow behind a card.

varying vec2 vUv;

uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;
uniform float uCount;
uniform float uSpin;
uniform float uRainbow;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float d = length(p);
  float angle = atan(p.y, p.x);
  float a = 0.5 + 0.5 * sin(angle * uCount + uTime * uSpin);
  float b = 0.5 + 0.5 * sin(angle * uCount * 0.5 - uTime * uSpin * 0.6 + 1.7);
  float rays = pow(a, 3.0) * 0.75 + pow(b, 4.0) * 0.5;
  // The middle is left dark: the rays are too fine there and would only blur into a white disc.
  float falloff = exp(-d * 2.4) * smoothstep(1.0, 0.25, d) * smoothstep(0.04, 0.3, d);
  vec3 colour = uColor;
  if (uRainbow > 0.5) {
    colour = 0.4 + 0.6 * (0.5 + 0.5 * cos(TAU * (angle / TAU + uTime * 0.08 + vec3(0.0, 0.333, 0.667))));
  }
  gl_FragColor = vec4(colour * rays * falloff * uIntensity, 1.0);
}
