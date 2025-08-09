#version 300 es
precision highp float;

in vec2 vUV;
in vec2 vScreenUV;
in vec2 vCardUV;
flat in int vEffects;

uniform sampler2D uAtlas;
uniform sampler2D uLightMap;
uniform vec3  uAmbientLight;
uniform float uAlpha;

// Crystal effect uniforms
uniform float uTime;              // seconds
uniform vec3  uCrystalTint;       // e.g., vec3(0.72, 0.86, 1.0)
uniform float uCrystalStrength;   // 0..1 master mix
uniform float uSparkleDensity;    // 0..1 density/intensity

out vec4 fragColor;

// ── helpers ──────────────────────────────────────────────────
float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise21(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i + vec2(0.0,0.0));
  float b = hash21(i + vec2(1.0,0.0));
  float c = hash21(i + vec2(0.0,1.0));
  float d = hash21(i + vec2(1.0,1.0));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float sat(float x){ return clamp(x, 0.0, 1.0); }
vec3  sat(vec3 v){ return clamp(v, 0.0, 1.0); }

// 2×2 rotation
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }

// ── main ─────────────────────────────────────────────────────
void main() {
  vec4 base = texture(uAtlas, vUV);
  if (base.a < 0.01) discard;

  // Base lighting
  vec3 L = texture(uLightMap, vScreenUV).rgb;
  vec3 ambientComponent = base.rgb * (uAmbientLight * 1.2);
  vec3 litComponent     = base.rgb * L;
  vec3 color            = mix(ambientComponent, litComponent, 0.85);

  if ( (vEffects & 1) == 1 ) {
    vec2  d        = vCardUV - 0.5;
    float r        = length(d) * 2.0;
    float rim      = smoothstep(0.50, 0.98, r);
    float fresnel  = pow(1.0 - sat(r), 2.0);
    float lightInt = luma(L);

    // ── Smooth reflective field (no grid):
    // Domain-warped noise, then use its gradient as a faux surface normal.
    // Rotate UV basis to kill axis alignment and animate subtly.
    vec2 p = (vCardUV - 0.5) * rot(0.7) + 0.5;          // rotated card UV
    p *= 4.0;                                           // base spatial frequency
    vec2 warp = vec2(
      noise21(p * 0.85 + uTime * 0.15),
      noise21(p * 1.10 - uTime * 0.12)
    );
    p += (warp - 0.5) * 1.1;                            // domain warp magnitude

    // Gradient of noise → 2D pseudo-normal
    float e = 0.0025;
    float n0 = noise21(p);
    float nx = noise21(p + vec2(e,0.0)) - n0;
    float ny = noise21(p + vec2(0.0,e)) - n0;
    vec2  n2 = normalize(vec2(nx, ny) + 1e-6);

    // Blend with a gentle spherical normal proxy to “round” the crystal body
    vec2 sphereN2 = normalize(d + 1e-6);
    float roundMix = 0.65;                               // 0=flat, 1=round
    vec2  fakeN2 = normalize(mix(n2, sphereN2, roundMix));

    // Specular proxy: align highlight with “light from screen center”
    vec2  lightDir2 = normalize(vScreenUV - 0.5);
    vec2  halfVec2  = normalize(lightDir2);
    float ndh       = sat(dot(fakeN2, halfVec2));
    float sharp     = mix(42.0, 110.0, sat(0.25 + 0.75*lightInt));
    float spec      = pow(ndh, sharp) * (0.35 + 0.65*lightInt);

    // Chromatic dispersion in specular
    vec3 specColor = vec3(
      spec * (0.90 + 0.10*sin(uTime*0.7 + 1.2)),
      spec * (0.95 + 0.05*sin(uTime*0.9 + 2.4)),
      spec * (1.00 + 0.03*sin(uTime*1.1 + 3.6))
    ) * (0.6 + 0.4*uSparkleDensity);

    // Screen-space reflection & refraction along the smooth normal
    float reflAmt = 0.0048;
    float refrAmt = 0.0034;
    vec2  reflectUV = clamp(vScreenUV + fakeN2 * reflAmt, 0.0, 1.0);
    vec2  refractUV = clamp(vScreenUV - fakeN2 * refrAmt, 0.0, 1.0);
    vec3  Lrefl     = texture(uLightMap, reflectUV).rgb;
    vec3  Lrefr     = texture(uLightMap, refractUV).rgb;

    vec3  reflectBoost = Lrefl * (0.30 + 0.30*lightInt);
    vec3  refractTint  = Lrefr * (0.18 + 0.22*lightInt) * uCrystalTint;

    // Sparkles (unchanged conceptually; now they sit atop a *continuous* reflective field)
    float seedA   = hash21(vUV *  896.0 + uTime*0.11);
    float seedB   = hash21(vUV * 1792.0 - uTime*0.07);
    float twA     = 0.5 + 0.5 * sin(uTime * (6.0 + seedA * 10.0) + seedA * 12.0);
    float twB     = 0.5 + 0.5 * sin(uTime * (3.0 + seedB *  6.0) + seedB *  9.0);
    float maskA   = smoothstep(1.0 - 0.035 * (0.25 + uSparkleDensity), 1.0, seedA * twA);
    float maskB   = smoothstep(1.0 - 0.020 * (0.15 + uSparkleDensity), 1.0, seedB * twB);
    float sparkle = 0.28 * maskA + 0.18 * maskB;

    // Inner glow & caustics (as before)
    float inner      = sat((1.0 - r) * (0.6 + 0.8*lightInt));
    vec3  innerGlow  = uCrystalTint * inner * 0.55;

    float bands = 0.5 + 0.5 * sin((vCardUV.x*24.0 + vCardUV.y*11.0) + uTime*0.9);
    bands *= (0.25 + 0.75*lightInt) * (1.0 - rim);
    vec3  caustic = uCrystalTint * bands * 0.22;

    // Enhanced rim glow
    vec3 rimGlow = uCrystalTint * pow(rim, 0.75) * (0.55 + 0.45*lightInt);

    // Base tint lift
    vec3 tintedBase = mix(color, color * uCrystalTint, 0.55 + 0.25*lightInt);

    // Composite
    vec3 crystal =
        tintedBase
      + rimGlow
      + innerGlow
      + reflectBoost
      + refractTint
      + specColor
      + vec3(sparkle)
      + caustic;

    float localBoost = sat(0.45 + 0.35*lightInt + 0.35*rim);
    color = mix(color, crystal, sat(uCrystalStrength * localBoost));
  }

  fragColor = vec4(sat(color), base.a * uAlpha);
}
