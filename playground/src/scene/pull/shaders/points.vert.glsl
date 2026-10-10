// Particles that are fully described by where and when they were born, so the CPU writes a particle once and the GPU
// moves it for the rest of its life.

attribute vec3 aVelocity;
attribute float aBirth;
attribute float aLife;
attribute float aSize;
attribute vec3 aColor;

uniform float uTime;
uniform float uGravity;
uniform float uDrag;
uniform float uScale;

varying vec3 vColor;
varying float vFade;

void main() {
  float age = uTime - aBirth;
  float alive = step(0.0, age) * step(age, aLife);
  float k = clamp(age / max(aLife, 0.0001), 0.0, 1.0);
  // Speed fades out with drag; gravity pulls down.
  float travel = (1.0 - exp(-uDrag * max(age, 0.0))) / max(uDrag, 0.0001);
  vec3 pos = position + aVelocity * travel - vec3(0.0, uGravity * 0.5 * age * age, 0.0);
  vec4 view = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * view;
  float twinkle = 0.75 + 0.25 * sin(age * 28.0 + aBirth * 91.0);
  gl_PointSize = aSize * (1.0 - k * 0.6) * alive * uScale / max(-view.z, 0.1);
  vColor = aColor;
  vFade = (1.0 - k) * alive * twinkle;
}
