uniform sampler2D uBackMap;
uniform float uHasBackMap;
uniform vec4 uBackTransform; // xy: scale, zw: offset (cover fit)
uniform float uIntensity;
uniform vec3 uCameraLocal;
uniform vec3 uLightLocal;
uniform float uAspect;

varying vec2 vUv;
varying vec3 vLocalPosition;

// Generic back used until a back image is supplied: lattice, five-ring emblem, light border.
vec3 proceduralBack(vec2 uv) {
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
  vec3 deep = vec3(0.07, 0.08, 0.2);
  vec3 glow = vec3(0.24, 0.2, 0.52);
  vec3 color = mix(deep, glow, smoothstep(0.75, 0.05, length(p)));

  vec2 lattice = vec2(p.x + p.y, p.x - p.y) * 14.0;
  vec2 toLine = abs(fract(lattice) - 0.5);
  float lineWidth = max(0.04, fwidth(lattice.x) * 1.2);
  color += vec3(0.4, 0.36, 0.8) * smoothstep(lineWidth, 0.0, min(toLine.x, toLine.y)) * 0.3;

  float radius = length(p);
  float emblem = smoothstep(0.01, 0.0, abs(radius - 0.24)) + smoothstep(0.007, 0.0, abs(radius - 0.275));
  for (int i = 0; i < 5; i++) {
    float a = PI * 0.5 + float(i) * TAU / 5.0;
    vec2 ringCenter = vec2(cos(a), sin(a)) * 0.125;
    emblem += smoothstep(0.008, 0.0, abs(length(p - ringCenter) - 0.06));
  }
  color = mix(color, vec3(0.92, 0.86, 1.0), clamp(emblem, 0.0, 1.0) * 0.85);

  float border = 1.0 - boxMask(uv, vec4(0.06, 0.045, 0.94, 0.955));
  return mix(color, vec3(0.9, 0.88, 0.95), border);
}

void main() {
  // The back face is the front geometry turned half a turn around Y; flip X and Z so the face normal is +Z.
  vec3 viewLocal = normalize(uCameraLocal - vLocalPosition);
  vec3 lightLocal = normalize(uLightLocal - vLocalPosition);
  vec3 V = vec3(-viewLocal.x, viewLocal.y, -viewLocal.z);
  vec3 L = vec3(-lightLocal.x, lightLocal.y, -lightLocal.z);

  vec3 base = uHasBackMap > 0.5
    ? texture2D(uBackMap, vUv * uBackTransform.xy + uBackTransform.zw).rgb
    : proceduralBack(vUv);

  vec3 color = shadePrint(base, V, L);
  vec3 H = normalize(L + V);
  color += spectrum(V.x * 2.0 + vUv.y * 0.6) * pow(max(H.z, 0.0), 8.0) * 0.08 * uIntensity;
  gl_FragColor = vec4(color, 1.0);
}
