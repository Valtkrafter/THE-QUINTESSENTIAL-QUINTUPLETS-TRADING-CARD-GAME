// The gate: a dark hole in space ringed by a thick swirl of cloud. Before it ignites it is only a faint ring; as the energy
// rises the cloud edges glow in the colour of the best card, with a bright line at the rim of the hole. `uZoom` is the dive:
// the ring rushes outwards past the edge of the screen and the black hole fills the picture.

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform vec2 uCenter;
uniform float uOpen;
uniform float uZoom;
uniform float uEnergy;
uniform float uRainbow;
uniform float uDetail;
uniform vec3 uColor;

void main() {
  vec2 p = (vUv - uCenter) * vec2(uAspect, 1.0) * 2.0;
  p /= max(uZoom, 0.05);
  float r = length(p);
  float a = atan(p.y, p.x);

  // Clouds that turn round the hole, faster close to it, folded into wisps by warping the noise with itself.
  float swirl = a + 1.15 / (r + 0.22) + uTime * 0.2;
  vec2 q = vec2(cos(swirl), sin(swirl)) * (r + 0.12);
  vec2 warp = vec2(fbm(q * 2.4 + vec2(uTime * 0.05, 0.0)), fbm(q * 2.4 + vec2(5.2, 1.3) - uTime * 0.04));
  float n1 = fbm(q * 3.0 + warp * 1.8);
  float n2 = uDetail > 0.5 ? fbm(q * 7.0 + warp * 2.6 - uTime * 0.08) : n1;
  float cloud = smoothstep(0.26, 0.74, n1 * 0.6 + n2 * 0.6);
  float ridge = pow(1.0 - abs(n2 * 2.0 - 1.0), 2.6);

  // The edge of the hole is slightly uneven, like the gate in the reference.
  float hole = 0.17 + 0.006 * sin(a * 7.0 + uTime * 0.8) + 0.03 * (n1 - 0.5);
  float inner = smoothstep(hole - 0.01, hole + 0.1, r);
  float outer = 1.0 - smoothstep(0.55, 1.75, r);
  float rim = exp(-(r - hole) * 5.2);

  vec3 tint = uColor;
  if (uRainbow > 0.5) {
    tint = 0.45 + 0.55 * (0.5 + 0.5 * cos(TAU * (a / TAU + r * 0.55 - uTime * 0.12 + vec3(0.0, 0.333, 0.667))));
  }
  float light = cloud * (0.14 + 0.95 * rim) + ridge * cloud * (0.12 + 0.7 * rim);
  vec3 col = tint * light * inner * outer * uEnergy;

  // The bright line along the rim, with a little flicker.
  float rimLine = exp(-abs(r - hole - 0.012) * 80.0) * (0.8 + 0.2 * sin(a * 14.0 + uTime * 3.0));
  col += mix(tint, vec3(1.0), 0.55) * rimLine * (0.2 + uEnergy) * 0.8;

  // Dark body of the ring, visible even before it lights up.
  col += vec3(0.020, 0.028, 0.060) * cloud * inner * outer;

  // Light shafts coming out of the hole.
  float shafts = pow(0.5 + 0.5 * sin(a * 11.0 + n1 * 3.0 - uTime * 0.3), 6.0) * exp(-r * 1.6) * smoothstep(hole, hole + 0.3, r);
  col += tint * shafts * uEnergy * 0.3;

  gl_FragColor = vec4(col * uOpen, 1.0);
}
