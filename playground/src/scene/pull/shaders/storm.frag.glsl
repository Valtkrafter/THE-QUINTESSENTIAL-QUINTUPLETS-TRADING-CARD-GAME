// The first shot of the show: a stormy planet seen from far above, a huge spiral of cloud with a dark eye. The camera falls
// towards the eye (`uZoom` grows) and the picture fades out at the end (`uFade`).

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform vec2 uCenter;
uniform float uZoom;
uniform float uFade;
uniform vec3 uTint;

void main() {
  vec2 p = (vUv - uCenter) * vec2(uAspect, 1.0) * 2.0;
  p /= max(uZoom, 0.05);
  float r = length(p);
  float a = atan(p.y, p.x);

  // The clouds turn faster the closer they are to the eye.
  float twist = 2.1 / (r + 0.32);
  float angle = a + twist - uTime * 0.16;
  vec2 q = vec2(cos(angle), sin(angle)) * r;
  float n1 = fbm(q * 2.3 + vec2(0.0, uTime * 0.03));
  float n2 = fbm(q * 5.2 - n1 * 1.6);
  float arms = 0.5 + 0.5 * sin(angle * 3.0 + n1 * 3.5);
  float cloud = smoothstep(0.32, 0.86, n1 * 0.6 + n2 * 0.5 + arms * 0.3);
  float ridge = pow(1.0 - abs(n2 * 2.0 - 1.0), 3.0);

  vec3 deep = vec3(0.012, 0.030, 0.062);
  vec3 mid = vec3(0.075, 0.170, 0.280);
  vec3 lite = mix(vec3(0.62, 0.80, 0.95), uTint, 0.35);
  vec3 col = mix(deep, mid, cloud);
  col += lite * ridge * cloud * 0.5;
  col += lite * exp(-r * 2.4) * 0.12;

  // The eye of the storm stays dark.
  col *= smoothstep(0.03, 0.3, r);
  col *= 1.0 - 0.65 * pow(length(vUv - 0.5) * 1.3, 2.0);
  gl_FragColor = vec4(col * uFade, 1.0);
}
