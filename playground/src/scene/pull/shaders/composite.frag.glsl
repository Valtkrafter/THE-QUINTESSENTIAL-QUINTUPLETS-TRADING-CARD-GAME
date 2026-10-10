// Puts the glowing background (rendered with bloom into a texture) on the screen unchanged.

varying vec2 vUv;

uniform sampler2D uTexture;

void main() {
  gl_FragColor = vec4(texture2D(uTexture, vUv).rgb, 1.0);
}
