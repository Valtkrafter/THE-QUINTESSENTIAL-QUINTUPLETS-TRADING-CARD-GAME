// A soft glow with a white core and an optional four-pointed flare: the head of the shooting star and the halo behind a
// revealed card. Drawn on a plane that always faces the camera.

varying vec2 vUv;

uniform vec3 uColor;
uniform vec3 uCore;
uniform float uIntensity;
uniform float uFlare;
uniform float uRainbow;
uniform float uTime;

void main() {
  vec2 p = vUv - 0.5;
  float d = length(p) * 2.0;
  float halo = exp(-d * d * 5.5);
  float core = exp(-d * d * 70.0);
  float flareH = exp(-abs(p.y) * 120.0) * exp(-abs(p.x) * 6.0);
  float flareV = exp(-abs(p.x) * 120.0) * exp(-abs(p.y) * 6.0);

  vec3 colour = uColor;
  if (uRainbow > 0.5) {
    colour = 0.4 + 0.6 * (0.5 + 0.5 * cos(TAU * (d * 0.6 - uTime * 0.5 + vec3(0.0, 0.333, 0.667))));
  }
  vec3 result = colour * halo * 0.75 + uCore * core * 1.25 + colour * (flareH + flareV) * uFlare;
  gl_FragColor = vec4(result * uIntensity, 1.0);
}
