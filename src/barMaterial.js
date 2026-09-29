// Shader für die Balken: flächig beleuchtet, heller Verlauf nach oben,
// leuchtende Kanten (Hologramm-Anmutung) – ohne Post-Processing, ein Draw-Call.

import * as THREE from 'three';

export function createBarMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aGlow;
      varying vec3 vColor;
      varying float vGlow;
      varying vec3 vPos;
      varying vec3 vScale;
      varying vec3 vNormal;
      varying float vWorldY;
      void main() {
        vec3 s = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vScale = s;
        vPos = position;
        vNormal = normal;
        vColor = aColor;
        vGlow = aGlow;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorldY = s.y * position.y;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vColor;
      varying float vGlow;
      varying vec3 vPos;
      varying vec3 vScale;
      varying vec3 vNormal;
      varying float vWorldY;
      void main() {
        vec3 n = abs(vNormal);
        // Abstand zur nächsten Kante in Metern (Normalenachse ausgeblendet)
        vec3 d = vec3(
          (0.5 - abs(vPos.x)) * vScale.x,
          min(vPos.y * vScale.y * 4.0, (1.0 - vPos.y) * vScale.y),
          (0.5 - abs(vPos.z)) * vScale.z
        );
        d = mix(d, vec3(1.0), step(0.5, n));
        float e = min(min(d.x, d.y), d.z);
        float edge = 1.0 - smoothstep(0.0012, 0.0042, e);

        // Einfache feste Beleuchtung: Deckel hell, Seiten abgestuft
        float light = n.y > 0.5 ? (vNormal.y > 0.0 ? 1.05 : 0.25) : (n.x > 0.5 ? 0.58 : 0.8);
        float grad = n.y > 0.5 ? 1.0 : mix(0.38, 1.0, pow(clamp(vPos.y, 0.0, 1.0), 0.75));
        vec3 col = vColor * light * grad;

        // Leuchtende Kanten, oben stärker
        float topBoost = mix(0.55, 1.0, clamp(vPos.y, 0.0, 1.0));
        col += (vColor * 1.1 + vec3(0.12)) * edge * topBoost;

        // Auswahl / Hover: Richtung Kupfer-Weiß anheben
        vec3 hi = vec3(0.95, 0.36, 0.13);
        col = mix(col, col * 0.25 + hi * (0.75 * light * grad + 0.6 * edge) + vec3(0.25, 0.12, 0.06) * edge, vGlow * 0.9);

        gl_FragColor = vec4(col, uOpacity);
        #include <colorspace_fragment>
      }
    `,
    transparent: false,
    toneMapped: false,
  });
}
