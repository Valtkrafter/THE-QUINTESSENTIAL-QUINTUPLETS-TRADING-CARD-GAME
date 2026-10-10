// Shared helpers for the card face shaders.
// Colors stay in display (sRGB) space so the blend math behaves like CSS / image-editor blend modes.

#define PI 3.141592653589793
#define TAU 6.283185307179586

float lumaOf(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Smooth looping rainbow: one full cycle per 1.0 of t.
vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(TAU * (t + vec3(0.0, 0.333, 0.667)));
}

vec3 screenBlend(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

// Ink printed over a reflective foil: unprinted (light) areas show the foil at full strength,
// heavy ink blocks it, and mid-tones pick up its tint.
vec3 foilThroughInk(vec3 ink, vec3 foil) {
  return clamp(ink * (0.35 + 1.3 * foil), 0.0, 1.0);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(cell);
  float b = hash12(cell + vec2(1.0, 0.0));
  float c = hash12(cell + vec2(0.0, 1.0));
  float d = hash12(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amplitude * valueNoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    amplitude *= 0.5;
  }
  return sum;
}

// Gradient (Perlin) noise with analytic derivatives: x = value, yz = d/dx, d/dy. The quintic fade keeps the
// derivative continuous, so normals built from it have no grid-aligned artifacts (value noise does).
vec3 gnoised(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = hash22(i) * 2.0 - 1.0;
  vec2 gb = hash22(i + vec2(1.0, 0.0)) * 2.0 - 1.0;
  vec2 gc = hash22(i + vec2(0.0, 1.0)) * 2.0 - 1.0;
  vec2 gd = hash22(i + vec2(1.0, 1.0)) * 2.0 - 1.0;
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd;
  return vec3(
    va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k,
    ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * k + vec2(vb, vc) - va)
  );
}

const mat2 OCTAVE_ROTATION = mat2(0.8, -0.6, 0.6, 0.8);

// Fractal gradient noise with derivatives (value, d/dp). Each octave is rotated, so no lattice direction shows.
vec3 fbmd(vec2 p) {
  float value = 0.0;
  vec2 grad = vec2(0.0);
  float amplitude = 0.5;
  float frequency = 1.0;
  mat2 m = mat2(1.0);
  for (int i = 0; i < 5; i++) {
    vec3 n = gnoised(m * p * frequency + float(i) * 17.3);
    value += amplitude * n.x;
    grad += amplitude * frequency * (transpose(m) * n.yz);
    frequency *= 2.0;
    amplitude *= 0.5;
    m = OCTAVE_ROTATION * m;
  }
  return vec3(value, grad);
}

// x: distance to the nearest cell point, y: distance to the nearest cell border (F2 - F1), zw: nearest cell id.
vec4 voronoi(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float nearest = 8.0;
  float second = 8.0;
  vec2 nearestId = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 offset = vec2(float(i), float(j));
      vec2 toPoint = offset + hash22(cell + offset) - f;
      float distSq = dot(toPoint, toPoint);
      if (distSq < nearest) {
        second = nearest;
        nearest = distSq;
        nearestId = cell + offset;
      } else if (distSq < second) {
        second = distSq;
      }
    }
  }
  float d1 = sqrt(nearest);
  return vec4(d1, sqrt(second) - d1, nearestId);
}

// Soft-edged rectangle in uv space. box.xy is the min corner, box.zw the max corner.
float boxMask(vec2 uv, vec4 box) {
  vec2 inside = smoothstep(box.xy, box.xy + 0.004, uv) * (1.0 - smoothstep(box.zw - 0.004, box.zw, uv));
  return inside.x * inside.y;
}

// Gloss-laminated print. All vectors are in face space, where the face normal is +Z.
vec3 shadePrint(vec3 base, vec3 V, vec3 L) {
  float diffuse = 0.86 + 0.14 * max(L.z, 0.0);
  vec3 H = normalize(L + V);
  float gloss = pow(max(H.z, 0.0), 90.0) * 0.22;
  float fresnel = pow(1.0 - max(V.z, 0.0), 4.0) * 0.12;
  return base * diffuse + vec3(gloss + fresnel);
}
