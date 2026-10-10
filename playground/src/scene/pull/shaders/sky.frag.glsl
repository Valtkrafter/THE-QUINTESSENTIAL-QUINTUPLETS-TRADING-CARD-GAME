// The dusk sky behind the whole show: a gradient from night blue to a rosy horizon, slow clouds and twinkling stars.
// `uDim` darkens it while cards are shown, `uGlow` lights it from the point where the star lands.

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform float uDim;
uniform float uGlow;
uniform vec3 uGlowColor;
uniform vec2 uGlowPos;

void main() {
  float y = vUv.y;
  vec3 top = vec3(0.020, 0.032, 0.095);
  vec3 mid = vec3(0.090, 0.095, 0.245);
  vec3 low = vec3(0.200, 0.140, 0.320);
  vec3 horizon = vec3(0.560, 0.330, 0.420);

  vec3 col = mix(horizon, low, smoothstep(0.0, 0.30, y));
  col = mix(col, mid, smoothstep(0.22, 0.62, y));
  col = mix(col, top, smoothstep(0.50, 1.00, y));

  // Slow bands of cloud, lit from below by the horizon.
  vec2 cloudUv = vec2(vUv.x * uAspect * 1.6 + uTime * 0.012, y * 5.0);
  float clouds = smoothstep(0.46, 0.80, fbm(cloudUv + vec2(0.0, uTime * 0.004)));
  float cloudBand = smoothstep(0.62, 0.08, y);
  col += clouds * cloudBand * vec3(0.55, 0.30, 0.40) * 0.30;

  // Stars in the upper sky.
  vec2 g = vUv * vec2(uAspect, 1.0) * 62.0;
  vec2 id = floor(g);
  vec2 cell = fract(g) - 0.5;
  float h = hash12(id);
  vec2 offset = (hash22(id + 3.7) - 0.5) * 0.6;
  float d = length(cell - offset);
  float twinkle = 0.55 + 0.45 * sin(uTime * (1.0 + h * 3.0) + h * 60.0);
  float star = step(0.972, h) * smoothstep(0.10, 0.0, d) * twinkle;
  col += star * smoothstep(0.30, 0.85, y) * vec3(0.85, 0.90, 1.0) * 0.9;

  // Dim for the card scene, light from the landing point of the star.
  col *= mix(1.0, 0.36, uDim);
  float distanceToGlow = length((vUv - uGlowPos) * vec2(uAspect, 1.0));
  col += uGlowColor * exp(-distanceToGlow * 2.6) * uGlow * 0.85;

  float vignette = 1.0 - 0.5 * pow(length(vUv - 0.5) * 1.25, 2.0);
  gl_FragColor = vec4(col * vignette, 1.0);
}
