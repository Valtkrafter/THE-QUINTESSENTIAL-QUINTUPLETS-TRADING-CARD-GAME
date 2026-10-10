varying vec3 vColor;
varying float vFade;

uniform float uBrightness;

void main() {
  if (vFade <= 0.001) {
    discard;
  }
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float soft = pow(smoothstep(1.0, 0.0, d), 2.0);
  float core = pow(smoothstep(0.35, 0.0, d), 2.0);
  gl_FragColor = vec4((vColor * soft + vec3(1.0) * core * 0.6) * vFade * uBrightness, 1.0);
}
