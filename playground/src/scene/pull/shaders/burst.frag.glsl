// The white-out at the end of the flight: a bright core, a cross-shaped star and veins of light that run outwards, like
// the cracks in the reference. `uStrength` fades it in and out.

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform vec2 uCenter;
uniform float uStrength;
uniform float uGrow;
uniform float uRainbow;
uniform vec3 uColor;

void main() {
  vec2 p = (vUv - uCenter) * vec2(uAspect, 1.0) * 2.0;
  float r = length(p) / max(uGrow, 0.05);
  float a = atan(p.y, p.x);

  float core = exp(-r * r * 9.0);
  // The cross: a long thin horizontal and vertical arm, and shorter diagonal ones.
  vec2 d = vec2(p.x + p.y, p.x - p.y) * 0.7071;
  float cross = exp(-abs(p.x) * 38.0) * exp(-abs(p.y) * 1.2) + exp(-abs(p.y) * 38.0) * exp(-abs(p.x) * 1.2);
  cross += 0.45 * (exp(-abs(d.x) * 44.0) * exp(-abs(d.y) * 2.4) + exp(-abs(d.y) * 44.0) * exp(-abs(d.x) * 2.4));

  // Veins: ridged noise that is stretched along the angle and flows outwards.
  float v = fbm(vec2(a * 2.6, r * 2.4 - uTime * 0.7));
  float vein = pow(1.0 - abs(v * 2.0 - 1.0), 9.0);
  float veins = vein * smoothstep(1.7, 0.1, r);

  vec3 tint = uColor;
  if (uRainbow > 0.5) {
    tint = 0.5 + 0.5 * cos(TAU * (a / TAU + r * 0.4 - uTime * 0.2 + vec3(0.0, 0.333, 0.667)));
  }
  vec3 hot = mix(tint, vec3(1.0), 0.7);
  vec3 col = hot * (core * 0.9 + cross * 0.55 + veins * 0.8);
  col += tint * exp(-r * 1.3) * 0.22;
  gl_FragColor = vec4(col * uStrength, 1.0);
}
