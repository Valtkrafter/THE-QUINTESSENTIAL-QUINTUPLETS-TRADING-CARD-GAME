// A ribbon of light: bright in the middle, fading towards its edges and its tail. Used for the shooting star's trail and
// for each of the five threads. `uRainbow` swaps the colour for a rainbow that runs along the ribbon.

varying vec2 vUv;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uIntensity;
uniform float uRainbow;
uniform float uSeed;

void main() {
  float along = vUv.x;
  float across = abs(vUv.y - 0.5) * 2.0;
  float body = pow(1.0 - across, 2.0);
  float core = pow(1.0 - across, 6.0);
  float fade = pow(1.0 - along, 1.5) * smoothstep(0.0, 0.02, along + 0.02);
  float flicker = 0.82 + 0.18 * sin(along * 46.0 - uTime * 26.0 + uSeed * 9.0);

  vec3 colour = mix(uColor, uCore, core);
  if (uRainbow > 0.5) {
    vec3 band = 0.35 + 0.65 * (0.5 + 0.5 * cos(TAU * (along * 0.9 - uTime * 0.45 + uSeed * 0.2 + vec3(0.0, 0.333, 0.667))));
    colour = mix(band, vec3(1.0), core);
  }
  float strength = (body * 0.8 + core * 0.9) * fade * flicker * uIntensity;
  gl_FragColor = vec4(colour * strength, 1.0);
}
