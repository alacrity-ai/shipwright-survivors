#version 300 es
precision mediump float;

in vec2 vUV;
in vec2 vScreenUV;

uniform sampler2D uAtlas;      
uniform sampler2D uLightMap;   
uniform vec3 uAmbientLight;    
uniform float uAlpha;          

out vec4 fragColor;

void main() {
  vec4 base = texture(uAtlas, vUV);
  if (base.a < 0.01) discard;

  vec3 lightSample = texture(uLightMap, vScreenUV).rgb;

  // More conservative approach - just boost ambient moderately
  vec3 ambientComponent = base.rgb * (uAmbientLight * 1.2);
  vec3 litComponent = base.rgb * lightSample;
  
  // Keep original mix ratio
  base.rgb = mix(ambientComponent, litComponent, 0.85);

  fragColor = vec4(base.rgb, base.a * uAlpha);
}