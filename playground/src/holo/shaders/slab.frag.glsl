// The clear plastic of a slab: almost see-through in the middle, glowing along the edges where you look across the
// plastic, with a glint where it mirrors the light and a soft reflection that slides over it as the case turns.
// Colours are in display (sRGB) space, like the card shaders.

uniform vec3 uLight; // world position of the light
uniform vec3 uRim; // colour of the glow along the edges

varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) {
    N = -N;
  }
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec3 L = normalize(uLight - vWorldPosition);
  vec3 H = normalize(L + V);

  float facing = clamp(abs(dot(N, V)), 0.0, 1.0);
  float rim = pow(1.0 - facing, 3.0);

  float aligned = max(dot(N, H), 0.0);
  float glint = pow(aligned, 90.0);
  float sheen = pow(aligned, 7.0);

  // A broad reflection of a window somewhere in the room: its position follows the view, so it sweeps across the case.
  float slide = V.x * 2.2 + V.y * 1.4 + vWorldPosition.x * 0.45 + vWorldPosition.y * 0.7;
  float band = pow(0.5 + 0.5 * sin(slide * 2.6), 18.0);

  vec3 tint = vec3(0.8, 0.86, 1.0);
  float alpha = 0.045 + rim * 0.5 + glint * 0.55 + sheen * 0.07 + band * 0.07;
  vec3 color = mix(tint, uRim, clamp(rim * 1.6, 0.0, 1.0)) + vec3(glint * 0.9 + band * 0.4);
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.9));
}
