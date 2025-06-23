#version 300 es
precision highp float;

in vec2 vScreenCenter;
in float vRadius;
in float vTime;
in float vStrength;
in float vType;

out vec4 fragColor;

void main() {
  vec2 fragPos = gl_FragCoord.xy;
  float dist = distance(fragPos, vScreenCenter);

  float alpha = 0.0;

  if (int(vType) == 0) {
    // Ripple / Shockwave
    float speed = 120.0;
    float rippleRadius = vTime * speed;
    float width = 8.0;
    float rippleFalloff = 1.0 - smoothstep(0.0, vRadius, dist);
    float ring = smoothstep(rippleRadius - width, rippleRadius, dist) * 
                 (1.0 - smoothstep(rippleRadius, rippleRadius + width, dist));
    alpha = ring * rippleFalloff * vStrength;

  } else if (int(vType) == 1) {
    // Pulsing shimmer
    float pulse = sin(vTime * 6.0 + dist * 0.05) * 0.5 + 0.5;
    float fade = 1.0 - smoothstep(0.0, vRadius, dist);
    alpha = pulse * fade * vStrength;
  }

  // Additive white glow
  fragColor = vec4(vec3(1.0), alpha);
}
