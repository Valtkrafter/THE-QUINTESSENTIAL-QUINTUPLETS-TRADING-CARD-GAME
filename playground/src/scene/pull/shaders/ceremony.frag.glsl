// The ceremony for Art Rare and better: on a black screen a thin line is drawn from the middle outwards, a jagged spike
// shoots up in its middle, and the stars on the line light up one after the other (three, four or five, by rarity).
// `uLit[i]` is how far star i has lit up (0..1) and `uPop[i]` is its short white flash. For the best rarity the stars wear
// the five Heart colours (`uHearts` = 1).

varying vec2 vUv;

uniform float uAspect;
uniform float uTime;
uniform float uDraw;
uniform float uSpike;
uniform float uCount;
uniform float uFade;
uniform float uHearts;
uniform float uLit[5];
uniform float uPop[5];
uniform vec3 uColor;
uniform vec3 uHeart[5];

const float HALF_LENGTH = 1.0;
const float GAP = 0.24;
const float STAR = 0.06;

// The concave four-pointed star of the reference: filled body, long thin arms, a soft halo.
float starShape(vec2 d) {
  vec2 q = abs(d) / STAR;
  float body = 1.0 - smoothstep(0.82, 1.0, pow(q.x, 0.62) + pow(q.y, 0.62));
  float arms = exp(-q.x * 34.0) * exp(-q.y * 0.9) + exp(-q.y * 34.0) * exp(-q.x * 0.9);
  float halo = exp(-dot(q, q) * 0.55);
  // Kept below the glow threshold in the middle, so the shape of the star survives the bloom.
  return body * 0.8 + arms * 0.42 + halo * 0.12;
}

// Only the outline of the star, for the places that are still dark.
float starOutline(vec2 d) {
  vec2 q = abs(d) / STAR;
  float f = pow(q.x, 0.62) + pow(q.y, 0.62);
  return exp(-abs(f - 1.0) * 34.0);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0;
  // The ornament is drawn in its own space and shrinks on a narrow screen so that it always fits.
  float s = min(1.0, 0.8 * uAspect);
  p /= s;
  float pixel = 2.4 / (s * 900.0);

  vec3 warm = mix(uColor, vec3(1.0), 0.35);

  // The line: drawn outwards from the middle, fading at both ends, a little brighter in the middle.
  float reach = HALF_LENGTH * uDraw;
  float body = smoothstep(reach, reach - 0.25, abs(p.x));
  float tips = 1.0 - smoothstep(0.55, 1.0, abs(p.x) / HALF_LENGTH);
  float line = exp(-abs(p.y) / (pixel * 0.9)) * body * (0.35 + 0.65 * tips);
  // Fine dashes along the line, like the engraving in the reference.
  float dashes = 0.65 + 0.35 * step(0.5, fract(p.x * 31.0));
  vec3 col = warm * line * dashes * 0.9;
  col += uColor * exp(-abs(p.y) * 38.0) * body * tips * 0.1;

  // The spike: thin vertical strokes that are tallest near the middle, the same on both sides of it.
  float spike = 0.0;
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    float x = 0.004 + hash12(vec2(fi, 1.7)) * 0.26;
    float height = (0.03 + 0.34 * pow(hash12(vec2(fi, 8.3)), 1.4)) * exp(-x * 6.0) * uSpike;
    float strokes = exp(-abs(p.x - x) / (pixel * 0.8)) + exp(-abs(p.x + x) / (pixel * 0.8));
    spike += strokes * (1.0 - smoothstep(height * 0.7, height, abs(p.y)));
  }
  col += warm * spike * 0.8 * smoothstep(0.0, 0.1, uSpike);

  // The stars.
  for (int i = 0; i < 5; i++) {
    if (float(i) >= uCount) {
      break;
    }
    float x = (float(i) - 0.5 * (uCount - 1.0)) * GAP;
    vec2 d = p - vec2(x, 0.0);
    float lit = uLit[i];
    float pop = uPop[i];
    vec3 tint = mix(uColor, uHeart[i], uHearts);
    vec3 hot = mix(tint, vec3(1.0), 0.7);
    // A dark place waits for its star.
    col += tint * starOutline(d) * 0.22 * (1.0 - lit) * uDraw;
    // The star itself: white-hot while it flashes, then its own colour.
    col += mix(tint, hot, pop) * starShape(d) * lit * (1.0 + pop * 0.8);
  }

  // A soft haze behind the ornament and a warm corner, like the reference.
  col += uColor * exp(-p.y * p.y * 22.0) * exp(-p.x * p.x * 0.9) * uDraw * 0.06;
  col += uColor * exp(-length((vUv - vec2(0.04, 0.98)) * vec2(uAspect, 1.0)) * 2.0) * uDraw * 0.07;

  gl_FragColor = vec4(col * uFade, 1.0);
}
