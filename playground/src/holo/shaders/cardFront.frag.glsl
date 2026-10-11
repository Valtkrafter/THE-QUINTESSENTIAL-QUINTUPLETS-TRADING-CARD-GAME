uniform sampler2D uMap;
uniform sampler2D uMask;
uniform vec4 uMapTransform; // xy: scale, zw: offset (cover fit of the art onto the card)
uniform float uHasMask;
uniform int uMaskMode;
uniform vec4 uArtBox; // xy: min uv, zw: max uv
uniform float uPremium; // embossed foil layer strength: 0 = off, SAR 1.0, UR 1.35 (see premium.ts)
uniform vec2 uFrameInset; // printed border width in uv (x, y); the "Frame edge" foil region is everything outside it
uniform int uFinish;
uniform float uIntensity;
uniform float uGlare;
uniform float uHover;
uniform vec2 uPointer; // pointer position in card uv
uniform float uTime;
uniform vec3 uCameraLocal; // camera position in this face's local space
uniform vec3 uLightLocal; // light position in this face's local space
uniform float uAspect; // card width / height
uniform vec4 uWear; // how worn each part of this copy is, 0 = perfect, 1 = ruined: x centering, y corners, z edges, w surface
uniform float uWearSeed; // 0..1, different for every copy, so no two worn cards wear alike

varying vec2 vUv;
varying vec3 vLocalPosition;

const vec3 ART_BACKDROP = vec3(0.95, 0.94, 0.97);

float foilMask(vec2 uv, vec2 mapUv, float tone) {
  if (uMaskMode == 1) return boxMask(uv, uArtBox);
  if (uMaskMode == 2) return 1.0 - boxMask(uv, uArtBox);
  if (uMaskMode == 3) return 1.0 - boxMask(uv, vec4(uFrameInset, 1.0 - uFrameInset));
  if (uMaskMode == 4) return smoothstep(0.42, 0.8, tone);
  if (uMaskMode == 5) return uHasMask > 0.5 ? texture2D(uMask, mapUv).r : 0.0;
  return 1.0;
}

// Sine pattern that fades to its average once its period drops below a couple of pixels, avoiding moire.
float antialiasedWave(float argument) {
  float fade = clamp(1.0 - fwidth(argument) / 2.5, 0.0, 1.0);
  return 0.5 + 0.5 * sin(argument) * fade;
}

// Diffraction-grating rainbow: hue follows the viewing angle, so bands sweep across the card as it tilts.
vec3 finishRainbow(vec3 base, vec2 uv, vec3 V, vec3 L, float mask, float tone) {
  vec3 color = shadePrint(base, V, L);
  float phase = V.x * 2.4 + V.y * 1.3 + uv.x * 1.7 + uv.y * 1.2;
  float grating = antialiasedWave((uv.x * uAspect + uv.y) * 300.0 + phase * 6.0);
  vec3 H = normalize(L + V);
  float sheen = 0.4 + 0.6 * pow(max(H.z, 0.0), 5.0);
  vec3 foil = spectrum(phase) * (0.78 + 0.22 * grating);
  float amount = mask * uIntensity * sheen * 0.85;
  // Half ink-over-foil, half screen: vivid on light areas without flattening the art into one tint.
  vec3 holo = mix(foilThroughInk(color, foil), screenBlend(color, foil * 0.55), 0.5);
  color = mix(color, holo, clamp(amount, 0.0, 1.0));
  return color + foil * tone * max(amount - 1.0, 0.0) * 0.3;
}

// Glitter flakes, each with its own random normal: only flakes facing the half-vector light up.
vec3 finishSparkle(vec3 base, vec2 uv, vec3 V, vec3 L, float mask, float tone) {
  vec3 color = shadePrint(base, V, L);
  float phase = V.x * 1.8 + V.y * 1.4 + uv.y * 0.7;
  float sheenAmount = clamp(mask * uIntensity * 0.45 * (0.3 + 0.7 * tone), 0.0, 1.0);
  color = mix(color, screenBlend(color, spectrum(phase) * 0.6), sheenAmount);

  vec2 grid = vec2(uv.x * uAspect, uv.y) * 85.0;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float seed = hash12(cell);
  vec2 flakeTilt = hash22(cell + 17.0) * 2.0 - 1.0;
  vec3 flakeNormal = normalize(vec3(flakeTilt * 0.5, 1.0));
  vec3 H = normalize(L + V);
  float glint = pow(max(dot(flakeNormal, H), 0.0), 260.0);
  float shape = smoothstep(0.5, 0.0, length(local));
  float present = step(0.3, seed);
  vec3 tint = mix(vec3(1.0), spectrum(seed * 3.0 + phase), 0.55);
  return color + tint * glint * shape * present * mask * uIntensity * 2.5;
}

float starLayer(vec2 p, float density) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  float seed = hash12(cell);
  vec2 center = hash22(cell + 3.1) * 0.6 + 0.2;
  float radius = 0.06 + 0.1 * hash12(cell + 7.7);
  float star = smoothstep(radius, 0.0, length(local - center));
  return star * step(1.0 - density, seed) * (0.4 + 0.6 * hash12(cell + 11.3));
}

// Nebula and star layers at different depths, offset by the view vector to read as space behind the print.
vec3 finishCosmos(vec3 base, vec2 uv, vec3 V, vec3 L, float mask, float tone) {
  vec3 color = shadePrint(base, V, L);
  vec2 parallax = V.xy / max(V.z, 0.25);
  vec2 p = vec2(uv.x * uAspect, uv.y);

  vec2 nebulaUv = p * 2.6 - parallax * 0.25;
  float warp = fbm(nebulaUv * 1.6 + 4.0);
  float cloud = fbm(nebulaUv + warp * 0.9);
  vec3 nebula = mix(vec3(0.04, 0.02, 0.16), vec3(0.62, 0.22, 0.9), smoothstep(0.25, 0.8, cloud));
  nebula = mix(nebula, vec3(0.1, 0.65, 0.98), smoothstep(0.55, 0.85, fbm(nebulaUv * 2.2 + 9.0)) * 0.8);
  nebula = mix(nebula, vec3(1.0, 0.45, 0.7), smoothstep(0.65, 0.9, warp) * 0.5);

  float stars = 0.0;
  for (int i = 0; i < 3; i++) {
    float layer = float(i);
    float depth = 0.06 + layer * 0.07;
    float scale = 22.0 + layer * 18.0;
    float twinkle = 0.6 + 0.4 * sin(uTime * (1.5 + layer) + layer * 2.1 + dot(V.xy, vec2(23.0, 17.0)));
    stars += starLayer(p * scale - parallax * depth * scale, 0.35) * twinkle;
  }

  float amount = clamp(mask * uIntensity * 0.9, 0.0, 1.0);
  vec3 cosmos = nebula * 1.15 + vec3(stars) * vec3(0.9, 0.95, 1.0);
  color = mix(color, foilThroughInk(color, cosmos), amount);
  vec3 H = normalize(L + V);
  color += spectrum(V.x * 2.0 + uv.y) * pow(max(H.z, 0.0), 12.0) * 0.18 * mask * uIntensity;
  return color + vec3(stars) * mask * uIntensity * 0.35;
}

// Hot-stamped gold: smooth foil with a gentle low-frequency ripple, reflecting a soft studio environment.
// No fine grain, so it never reads as brushed or woven. `tone` embosses the print into the metal.
vec3 goldFoil(vec2 uv, vec3 V, vec3 L, float tone) {
  vec3 gold = vec3(1.0, 0.8, 0.42);

  // Relief from gradient noise with exact derivatives: broad swells plus a fine grain that fades out once it
  // gets smaller than a pixel. (A finite-difference value-noise normal showed square, grid-aligned patches.)
  vec2 p = vec2(uv.x * uAspect, uv.y);
  vec3 swell = fbmd(p * 1.6);
  vec3 grain = fbmd(p * 46.0 + 9.1);
  float grainFade = clamp(1.0 - fwidth(p.x * 46.0) * 0.7, 0.0, 1.0);
  vec2 slope = swell.yz * 1.6 * 0.030 + grain.yz * 46.0 * 0.0014 * grainFade;
  vec3 N = normalize(vec3(-slope, 1.0));

  vec3 R = reflect(-V, N);
  float studio = 0.38 + 0.62 * pow(clamp(0.5 + 0.5 * (R.y * 1.8 - R.x * 0.8), 0.0, 1.0), 1.5);
  studio += 0.3 * smoothstep(0.75, 1.0, 0.5 + 0.5 * sin(R.x * 6.0 + R.y * 3.0));
  vec3 H = normalize(L + V);
  float highlight = pow(max(dot(N, H), 0.0), 70.0);

  float emboss = 0.22 + 1.0 * tone;
  return gold * studio * emboss + mix(gold, vec3(1.0), 0.5) * highlight * 0.9;
}

vec3 finishGold(vec3 base, vec2 uv, vec3 V, vec3 L, float mask, float tone) {
  vec3 color = shadePrint(base, V, L);
  vec3 metal = goldFoil(uv, V, L, tone);
  float amount = mask * uIntensity;
  return mix(color, metal, clamp(amount, 0.0, 1.0)) + metal * max(amount - 1.0, 0.0) * 0.3;
}

// Equilateral triangle lattice (simplex grid). xy = cell, z = which half of the cell, w = distance to the
// nearest edge in barycentric units (0 on an edge, 1/3 at the centre).
vec4 triangleLattice(vec2 p) {
  vec2 s = p + (p.x + p.y) * 0.3660254;
  vec2 cell = floor(s);
  vec2 f = s - cell;
  float lower = step(f.y, f.x);
  vec3 b = lower > 0.5 ? vec3(1.0 - f.x, f.x - f.y, f.y) : vec3(1.0 - f.y, f.y - f.x, f.x);
  return vec4(cell, lower, min(min(b.x, b.y), b.z));
}

// Prism Crystal: a cut-gem surface. The card is a lattice of triangular facets, each tilted a little
// differently, so as the card moves the facets flash in turn. The red, green and blue peaks of a flash sit
// slightly apart (colour dispersion, like light leaving a diamond) and hairline bevels catch the light.
vec3 finishPrism(vec3 base, vec2 uv, vec3 V, vec3 L, float mask, float tone) {
  vec3 color = shadePrint(base, V, L);
  vec2 p = vec2(uv.x * uAspect, uv.y);
  vec4 big = triangleLattice(p * 9.0);
  vec4 fine = triangleLattice(p * 27.0 + 4.1);
  vec2 bigTilt = hash22(big.xy * 2.0 + big.z + 3.7) * 2.0 - 1.0;
  vec2 fineTilt = hash22(fine.xy * 2.0 + fine.z + 8.9) * 2.0 - 1.0;
  float seed = hash12(big.xy * 2.0 + big.z);
  vec3 N = normalize(vec3(bigTilt * 0.5 + fineTilt * 0.1, 1.0));
  vec3 H = normalize(L + V);
  float d = dot(N, H);

  // Hard flash with split colour peaks, plus a soft tinted sheen so unlit facets still shimmer.
  vec3 flash = pow(clamp(vec3(d + 0.012, d, d - 0.012), 0.0, 1.0), vec3(120.0));
  vec3 tint = spectrum(seed + dot(N.xy, V.xy) * 6.0 + V.x * 1.2);
  vec3 sheen = mix(vec3(0.92), tint, 0.55) * pow(max(d, 0.0), 70.0) * 0.5;

  float edge = big.w;
  float line = 1.0 - smoothstep(0.0, max(fwidth(edge) * 1.4, 0.012), edge);
  vec3 bevel = mix(vec3(1.0), tint, 0.35) * line * (0.12 + 0.9 * pow(max(d, 0.0), 60.0));

  float amount = clamp(mask * uIntensity, 0.0, 2.0);
  float lit = min(amount, 1.0);
  // Multiplicative part: facets shade and tint the print itself, so the cut reads even on pale art
  // (a screen blend alone washes out there).
  float shade = 0.92 + 0.16 * dot(N, L);
  vec3 facetTint = mix(vec3(1.0), tint * 1.1, 0.04 + 0.34 * pow(max(d, 0.0), 40.0));
  color *= mix(vec3(1.0), shade * facetTint, lit);
  vec3 add = (sheen + flash * 1.6 + bevel) * amount;
  return screenBlend(clamp(color, 0.0, 1.0), clamp(add, 0.0, 1.0));
}

// Starburst rays and etched rings around a focal point; both rotate and ripple with the tilt.
vec3 finishRadiant(vec3 base, vec2 uv, vec3 V, vec3 L, float mask, float tone) {
  vec3 color = shadePrint(base, V, L);
  vec2 fromCenter = (uv - vec2(0.5, 0.56)) * vec2(uAspect, 1.0);
  float radius = length(fromCenter);
  float angle = atan(fromCenter.y, fromCenter.x + 1e-5);
  float rays = pow(0.5 + 0.5 * cos((angle + V.x * 2.5 - V.y * 1.5) * 36.0), 4.0) * smoothstep(0.0, 0.06, radius);
  float rings = antialiasedWave(radius * 220.0 - (V.x + V.y) * 40.0);
  float phase = angle / TAU * 2.0 + radius * 1.2 + V.x * 1.8 - V.y * 1.2;
  vec3 foil = spectrum(phase) * (0.35 + 0.9 * rays) * (0.8 + 0.2 * rings);
  vec3 H = normalize(L + V);
  float sheen = 0.45 + 0.55 * pow(max(H.z, 0.0), 4.0);
  float amount = clamp(mask * uIntensity * sheen, 0.0, 1.0);
  return mix(color, foilThroughInk(color, foil), amount);
}

// Embossed foil relief for SAR / UR: a fine grid of tiny facets, each with its own tilt, like the raised
// sand texture of a premium print. Facets facing the light glint; the rest only shade the foil slightly.
// Fades out below about a pixel per cell so small cards never alias.
vec3 premiumRelief(vec3 color, vec2 uv, vec3 V, vec3 L, float mask) {
  vec2 grid = vec2(uv.x * uAspect, uv.y) * 190.0;
  vec2 cell = floor(grid);
  // Each facet is a rounded grain, jittered inside its cell, so the pattern reads as sand and not as tiles.
  vec2 local = fract(grid) - 0.5 - (hash22(cell + 7.3) - 0.5) * 0.35;
  float grain = smoothstep(0.52, 0.12, length(local));
  vec3 N = normalize(vec3((hash22(cell + 41.7) * 2.0 - 1.0) * 0.4, 1.0));
  vec3 H = normalize(L + V);
  float detail = clamp(1.0 - fwidth(grid.x) * 0.9, 0.0, 1.0);
  float glint = pow(max(dot(N, H), 0.0), 60.0) * grain * detail;
  float shade = 1.0 + (dot(N, L) - L.z) * 0.22 * grain * detail;
  vec3 tint = mix(vec3(1.0), spectrum(hash12(cell) * 2.0 + V.x * 1.5 + V.y), 0.35);
  float amount = clamp(mask * uPremium, 0.0, 1.5);
  return color * mix(1.0, shade, min(amount, 1.0)) + tint * glint * amount * 0.8;
}

// Raised edge of the hot-stamped signature plate: the foil's mask gradient acts as a height edge, and
// only edges facing the light add a highlight, so the plate reads as embossed.
vec3 signatureBevel(vec2 mapUv, vec3 V, vec3 L) {
  vec2 texel = vec2(1.0 / 500.0, 1.0 / 700.0);
  float gx = texture2D(uMask, mapUv + vec2(texel.x, 0.0)).g - texture2D(uMask, mapUv - vec2(texel.x, 0.0)).g;
  float gy = texture2D(uMask, mapUv + vec2(0.0, texel.y)).g - texture2D(uMask, mapUv - vec2(0.0, texel.y)).g;
  vec3 N = normalize(vec3(-gx * 1.8, -gy * 1.8, 1.0));
  vec3 H = normalize(L + V);
  float edge = max(0.0, pow(max(dot(N, H), 0.0), 18.0) - pow(max(H.z, 0.0), 18.0));
  return vec3(1.0, 0.93, 0.72) * edge * 2.2;
}

// Wear of a printed copy. These are the strongest cases (wear 1); a normal copy shows only a hint.
// Centering: the print sits off centre on the card stock, so one side shows a white strip and the other loses a little.
vec2 centeringShift(float wear, float seed) {
  float angle = seed * TAU;
  return vec2(cos(angle), sin(angle)) * wear * 0.05;
}

// Whitened corners and edges, scratches that flash when the light slides along them, and a dull haze on the surface.
vec3 applyWear(vec3 color, vec2 uv, vec3 V, vec3 L) {
  float corners = uWear.y;
  float edges = uWear.z;
  float surface = uWear.w;
  if (corners + edges + surface <= 0.001) {
    return color;
  }
  vec2 p = vec2(uv.x * uAspect, uv.y);
  vec2 inner = min(p, vec2(uAspect, 1.0) - p);
  float edgeDistance = min(inner.x, inner.y);
  float cornerDistance = length(inner);
  float coarse = valueNoise(p * 60.0 + uWearSeed * 37.0);
  float fine = valueNoise(p * 240.0 + 11.0);
  vec3 stock = vec3(0.94, 0.92, 0.88);

  float edgeWidth = 0.004 + 0.02 * edges;
  float edgeChips = smoothstep(0.35, 0.8, coarse * 0.55 + fine * 0.45 + edges * 0.45);
  float edgeAmount = smoothstep(edgeWidth, 0.0, edgeDistance) * edgeChips * min(1.0, edges * 1.6);
  float cornerSize = 0.012 + 0.05 * corners;
  float cornerAmount = smoothstep(cornerSize, 0.0, cornerDistance) * (0.7 + 0.3 * fine) * min(1.0, corners * 1.6);
  color = mix(color, stock, clamp(max(edgeAmount, cornerAmount), 0.0, 0.95));

  vec3 H = normalize(L + V);
  float flash = 0.3 + 0.7 * pow(max(H.z, 0.0), 3.0 + 10.0 * (1.0 - surface));
  float scratches = 0.0;
  for (int i = 0; i < 7; i++) {
    if (float(i) >= surface * 7.0 + 0.001) {
      break;
    }
    vec2 seed2 = vec2(float(i) * 1.37, uWearSeed * 19.0);
    vec2 center = hash22(seed2) * vec2(uAspect, 1.0);
    float angle = hash12(seed2 + 5.3) * PI;
    vec2 along = vec2(cos(angle), sin(angle));
    vec2 across = vec2(-along.y, along.x);
    float reach = 0.12 + 0.3 * hash12(seed2 + 9.1);
    vec2 d = p - center;
    float line = smoothstep(0.0016, 0.0, abs(dot(d, across))) * smoothstep(reach, reach * 0.6, abs(dot(d, along)));
    scratches = max(scratches, line);
  }
  color += vec3(0.5) * scratches * flash * 0.8;
  return mix(color, color * 0.9 + 0.04, surface * 0.35 * (0.5 + 0.5 * coarse));
}

void main() {
  vec2 uv = vUv;
  vec2 mapUv = (uv - centeringShift(uWear.x, uWearSeed)) * uMapTransform.xy + uMapTransform.zw;
  // "Contain" fit leaves card area outside the image; fill it with a plain backdrop.
  vec2 inRange = step(vec2(0.0), mapUv) * step(mapUv, vec2(1.0));
  vec3 base = mix(ART_BACKDROP, texture2D(uMap, mapUv).rgb, inRange.x * inRange.y);
  vec3 V = normalize(uCameraLocal - vLocalPosition);
  vec3 L = normalize(uLightLocal - vLocalPosition);
  float tone = clamp(lumaOf(base), 0.0, 1.0);
  // Blue mask channel marks text areas: they never take foil, whichever region is selected.
  float textArea = uHasMask > 0.5 ? texture2D(uMask, mapUv).b : 0.0;
  float mask = foilMask(uv, mapUv, tone) * (1.0 - textArea);

  vec3 color;
  if (uFinish == 1) color = finishRainbow(base, uv, V, L, mask, tone);
  else if (uFinish == 2) color = finishSparkle(base, uv, V, L, mask, tone);
  else if (uFinish == 3) color = finishCosmos(base, uv, V, L, mask, tone);
  else if (uFinish == 4) color = finishGold(base, uv, V, L, mask, tone);
  else if (uFinish == 5) color = finishPrism(base, uv, V, L, mask, tone);
  else if (uFinish == 6) color = finishRadiant(base, uv, V, L, mask, tone);
  else color = shadePrint(base, V, L);

  // Embossed relief on SAR / UR only (uPremium is 0 for every other rarity), over whatever finish is chosen.
  if (uPremium > 0.0) {
    color = premiumRelief(color, uv, V, L, mask);
  }

  // Signature layer (mask green channel) is always gold foil, whatever the finish.
  // The mask is half resolution: tighten its soft edge so the foil follows the letter shapes.
  float signature = uHasMask > 0.5 ? smoothstep(0.3, 0.7, texture2D(uMask, mapUv).g) : 0.0;
  vec3 plate = goldFoil(uv, V, L, 0.8);
  if (uPremium > 0.0 && signature > 0.0) {
    plate += signatureBevel(mapUv, V, L) * uPremium;
  }
  color = mix(color, plate, signature);

  color = applyWear(color, uv, V, L);

  // Soft light that follows the pointer while the card is hovered.
  vec2 toPointer = (uv - uPointer) * vec2(uAspect, 1.0);
  float glare = exp(-dot(toPointer, toPointer) * 7.0);
  color = screenBlend(clamp(color, 0.0, 1.0), vec3(glare * uGlare * uHover * 0.45));

  gl_FragColor = vec4(color, 1.0);
}
