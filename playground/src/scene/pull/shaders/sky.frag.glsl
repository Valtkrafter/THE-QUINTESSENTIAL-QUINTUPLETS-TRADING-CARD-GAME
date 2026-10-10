// The sky behind the whole show. By default it is the dusk sky (gradient from night blue to a rosy horizon, slow clouds,
// twinkling stars). With `uSpace` at 1 it becomes deep space: almost black with many small stars, for the flight and the
// ceremony. `uLevel` fades the whole sky to black and back, `uDim` darkens it while cards are shown, `uGlow` lights it from
// the point where the light lands.

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform float uDim;
uniform float uGlow;
uniform float uSpace;
uniform float uLevel;
uniform vec3 uGlowColor;
uniform vec2 uGlowPos;

void main() {
  float y = vUv.y;
  vec3 top = vec3(0.020, 0.032, 0.095);
  vec3 mid = vec3(0.090, 0.095, 0.245);
  vec3 low = vec3(0.200, 0.140, 0.320);
  vec3 horizon = vec3(0.560, 0.330, 0.420);

  vec3 dusk = mix(horizon, low, smoothstep(0.0, 0.30, y));
  dusk = mix(dusk, mid, smoothstep(0.22, 0.62, y));
  dusk = mix(dusk, top, smoothstep(0.50, 1.00, y));

  // Slow bands of cloud, lit from below by the horizon.
  vec2 cloudUv = vec2(vUv.x * uAspect * 1.6 + uTime * 0.012, y * 5.0);
  float clouds = smoothstep(0.46, 0.80, fbm(cloudUv + vec2(0.0, uTime * 0.004)));
  float cloudBand = smoothstep(0.62, 0.08, y);
  dusk += clouds * cloudBand * vec3(0.55, 0.30, 0.40) * 0.30 * (1.0 - uSpace);

  // Deep space: nearly black, with a faint blue breath near the middle.
  vec3 space = mix(vec3(0.004, 0.006, 0.014), vec3(0.002, 0.003, 0.008), y);
  space += vec3(0.010, 0.016, 0.034) * exp(-length(vUv - vec2(0.5, 0.52)) * 2.8);

  vec3 col = mix(dusk, space, uSpace);

  // Stars: sparse in the dusk sky, many in space.
  vec2 g = vUv * vec2(uAspect, 1.0) * mix(62.0, 90.0, uSpace);
  vec2 id = floor(g);
  vec2 cell = fract(g) - 0.5;
  float h = hash12(id);
  vec2 offset = (hash22(id + 3.7) - 0.5) * 0.6;
  float d = length(cell - offset);
  float twinkle = 0.55 + 0.45 * sin(uTime * (1.0 + h * 3.0) + h * 60.0);
  float threshold = mix(0.972, 0.93, uSpace);
  float star = step(threshold, h) * smoothstep(0.10, 0.0, d) * twinkle;
  float skyMask = mix(smoothstep(0.30, 0.85, y), 1.0, uSpace);
  col += star * skyMask * vec3(0.85, 0.90, 1.0) * mix(0.9, 0.75, uSpace);

  // Dim for the card scene, light from the landing point.
  col *= mix(1.0, 0.36, uDim);
  float distanceToGlow = length((vUv - uGlowPos) * vec2(uAspect, 1.0));
  col += uGlowColor * exp(-distanceToGlow * 2.6) * uGlow * 0.85;

  float vignette = 1.0 - 0.5 * pow(length(vUv - 0.5) * 1.25, 2.0);
  gl_FragColor = vec4(col * vignette * uLevel, 1.0);
}
