// Fast thin lines flying away from the middle of the screen (the feeling of speed) and a few fine curved lines in the
// distance, like orbits. `uSpeed` is 0 when the picture stands still; `uFlow` is the distance the lines have flown so far
// (the time summed up with the speed of every moment, so a change of speed never makes the lines jump).

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform vec2 uCenter;
uniform float uFlow;
uniform float uSpeed;
uniform float uArcs;
uniform vec3 uColor;
uniform float uRainbow;

float arc(vec2 p, vec2 centre, float radius, float width, float from, float to) {
  vec2 d = p - centre;
  float ring = exp(-abs(length(d) - radius) / width);
  float angle = atan(d.y, d.x);
  float mask = smoothstep(from, from + 0.4, angle) * (1.0 - smoothstep(to - 0.4, to, angle));
  return ring * mask;
}

void main() {
  vec2 p = (vUv - uCenter) * vec2(uAspect, 1.0) * 2.0;
  float r = length(p);
  float a = atan(p.y, p.x) / TAU + 0.5;

  // Lines: each lane of the circle has one line that keeps flying outwards.
  float bins = 110.0;
  float bin = floor(a * bins);
  float lane = fract(a * bins);
  float h = hash12(vec2(bin, 3.7));
  float across = smoothstep(0.5, 0.0, abs(lane - 0.5));
  across = across * across;
  float cycle = fract(uFlow * (0.45 + h * 0.9) + h * 9.0);
  float head = cycle * 2.4;
  float tail = (0.06 + h * 0.5) * (0.3 + uSpeed);
  float line = smoothstep(head - tail, head, r) * (1.0 - smoothstep(head, head + 0.02, r));
  line *= across * across * step(0.45, h) * smoothstep(0.12, 0.5, r);

  vec3 tint = uColor;
  if (uRainbow > 0.5) {
    tint = 0.55 + 0.45 * cos(TAU * (a + uTime * 0.2 + vec3(0.0, 0.333, 0.667)));
  }
  vec3 col = mix(tint, vec3(1.0), 0.5) * line * uSpeed * 0.7;

  // A few thin arcs far away.
  float arcs = arc(p, vec2(-0.2, 0.1), 1.35, 0.004, -2.6, 1.2)
    + arc(p, vec2(0.35, -0.25), 1.9, 0.004, -0.4, 2.7)
    + arc(p, vec2(0.0, 0.0), 0.62, 0.003, 0.3, 3.0) * 0.7
    + arc(p, vec2(-0.5, -0.4), 2.5, 0.005, -1.3, 1.9);
  col += tint * arcs * uArcs * 0.55;

  gl_FragColor = vec4(col, 1.0);
}
