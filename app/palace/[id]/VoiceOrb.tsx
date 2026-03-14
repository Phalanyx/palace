'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type OrbState = 'idle' | 'listening' | 'speaking';

interface VoiceOrbProps {
  state: OrbState;
  inputLevel: number;
  outputLevel: number;
}

// Simplex-style 3D noise (compact GLSL)
const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const vertexShader = /* glsl */ `
${noiseGLSL}
uniform float u_time;
uniform float u_amplitude;
uniform float u_speed;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

void main() {
  float displacement = snoise(normal * 1.5 + u_time * u_speed) * 0.15 * (0.3 + u_amplitude * 0.7);
  displacement += snoise(normal * 3.0 - u_time * u_speed * 0.7) * 0.08 * u_amplitude;

  vec3 newPosition = position + normal * displacement;
  vDisplacement = displacement;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(newPosition, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float u_time;
uniform float u_amplitude;
uniform float u_state; // 0 = idle, 1 = listening, 2 = speaking

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

// Cosine palette
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  float fresnel = pow(1.0 - abs(dot(normalize(-vPosition), vNormal)), 2.0);

  // Idle: deep indigo/violet — no green
  vec3 idleColor = palette(
    fresnel + vDisplacement * 2.0 + u_time * 0.1,
    vec3(0.22, 0.15, 0.45),
    vec3(0.18, 0.10, 0.30),
    vec3(1.0, 1.0, 1.0),
    vec3(0.75, 0.80, 0.65)
  );

  // Listening (user talking): violet-pink warmth
  vec3 listenColor = palette(
    fresnel + vDisplacement * 3.0 + u_time * 0.15,
    vec3(0.45, 0.18, 0.45),
    vec3(0.30, 0.12, 0.28),
    vec3(1.0, 1.0, 1.0),
    vec3(0.85, 0.70, 0.60)
  );

  // Speaking (AI voice): bright blue-white radiance
  vec3 speakColor = palette(
    fresnel + vDisplacement * 3.0 + u_time * 0.15,
    vec3(0.35, 0.42, 0.70),
    vec3(0.25, 0.25, 0.30),
    vec3(1.0, 1.0, 1.0),
    vec3(0.60, 0.70, 0.55)
  );

  // Blend based on state
  float listenBlend = smoothstep(0.0, 1.0, clamp(u_state, 0.0, 1.0));
  float speakBlend = smoothstep(1.0, 2.0, clamp(u_state, 1.0, 2.0));

  vec3 color = mix(idleColor, listenColor, listenBlend);
  color = mix(color, speakColor, speakBlend);

  // Amplitude-driven brightness (stronger when AI is speaking)
  float brightBoost = fresnel * 0.25 * (0.3 + u_amplitude * 0.7);
  // Speaking state gets extra white-blue bloom
  brightBoost += smoothstep(1.0, 2.0, u_state) * u_amplitude * 0.3;
  color += vec3(0.6, 0.65, 1.0) * brightBoost;

  // Edge glow — indigo tint
  color += vec3(0.35, 0.25, 0.6) * fresnel * 0.35;

  gl_FragColor = vec4(color, 1.0);
}
`;

// Glow layer shaders
const glowVertexShader = /* glsl */ `
${noiseGLSL}
uniform float u_time;
uniform float u_amplitude;
uniform float u_speed;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  float displacement = snoise(normal * 1.5 + u_time * u_speed) * 0.1 * (0.3 + u_amplitude * 0.7);
  vec3 newPosition = position + normal * displacement;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(newPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const glowFragmentShader = /* glsl */ `
uniform float u_amplitude;
uniform float u_state;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  float fresnel = pow(1.0 - abs(dot(normalize(-vPosition), vNormal)), 3.0);

  vec3 idleGlow = vec3(0.35, 0.2, 0.85);
  vec3 listenGlow = vec3(0.6, 0.25, 0.7);
  vec3 speakGlow = vec3(0.45, 0.55, 1.0);

  float listenBlend = smoothstep(0.0, 1.0, clamp(u_state, 0.0, 1.0));
  float speakBlend = smoothstep(1.0, 2.0, clamp(u_state, 1.0, 2.0));

  vec3 glowColor = mix(idleGlow, listenGlow, listenBlend);
  glowColor = mix(glowColor, speakGlow, speakBlend);

  float alpha = fresnel * (0.15 + u_amplitude * 0.35);
  gl_FragColor = vec4(glowColor, alpha);
}
`;

function OrbMesh({ state, inputLevel, outputLevel }: VoiceOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const stateRef = useRef(0); // smoothed state value

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_amplitude: { value: 0 },
      u_speed: { value: 0.3 },
      u_state: { value: 0 },
    }),
    []
  );

  const glowUniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_amplitude: { value: 0 },
      u_speed: { value: 0.25 },
      u_state: { value: 0 },
    }),
    []
  );

  useFrame((_, delta) => {
    // Determine target state value: 0=idle, 1=listening, 2=speaking
    const targetState = state === 'speaking' ? 2 : state === 'listening' ? 1 : 0;
    stateRef.current += (targetState - stateRef.current) * Math.min(delta * 4, 1);

    const amplitude = state === 'speaking' ? outputLevel : state === 'listening' ? inputLevel : 0;

    // Update main uniforms
    uniforms.u_time.value += delta;
    uniforms.u_amplitude.value += (amplitude - uniforms.u_amplitude.value) * Math.min(delta * 8, 1);
    uniforms.u_speed.value = 0.3 + amplitude * 0.5;
    uniforms.u_state.value = stateRef.current;

    // Update glow uniforms
    glowUniforms.u_time.value = uniforms.u_time.value;
    glowUniforms.u_amplitude.value = uniforms.u_amplitude.value;
    glowUniforms.u_speed.value = uniforms.u_speed.value;
    glowUniforms.u_state.value = stateRef.current;
  });

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
      <mesh ref={glowRef} scale={1.15}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          vertexShader={glowVertexShader}
          fragmentShader={glowFragmentShader}
          uniforms={glowUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

export default function VoiceOrb({ state, inputLevel, outputLevel }: VoiceOrbProps) {
  return (
    <div style={{ width: 56, height: 56, pointerEvents: 'none' }}>
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <OrbMesh state={state} inputLevel={inputLevel} outputLevel={outputLevel} />
      </Canvas>
    </div>
  );
}
