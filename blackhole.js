import * as THREE from 'three';

const canvas = document.getElementById('blackhole-bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Full-screen quad with black hole shader
const geo = new THREE.PlaneGeometry(2, 2);
const mat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  },
  vertexShader: `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;

    #define PI 3.14159265
    #define RING_INNER 0.18
    #define RING_OUTER 0.55
    #define BH_RADIUS 0.12

    // Pseudo-random
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    // Star field
    float stars(vec2 uv, float scale) {
      vec2 id = floor(uv * scale);
      vec2 f = fract(uv * scale);
      float d = 1.0;
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 p = vec2(hash(id + neighbor), hash(id + neighbor + 100.0));
          float size = hash(id + neighbor + 200.0);
          if (size < 0.85) continue; // only bright stars
          d = min(d, length(f - neighbor - p));
        }
      }
      float brightness = 1.0 - smoothstep(0.0, 0.025, d);
      return brightness;
    }

    // Accretion disk color (hot gas: orange → white → teal)
    vec3 diskColor(float r, float angle, float t) {
      // Temperature gradient: inner = white-hot, outer = orange/teal
      float temp = smoothstep(RING_OUTER, RING_INNER, r);
      vec3 hot = vec3(1.0, 0.95, 0.9);        // white-hot core
      vec3 mid = vec3(0.9, 0.4, 0.1);          // orange
      vec3 cool = vec3(0.05, 0.58, 0.53);      // teal (brand color)

      vec3 col = mix(cool, mid, temp);
      col = mix(col, hot, temp * temp);

      // Swirl pattern
      float swirl = sin(angle * 3.0 - t * 0.8 + r * 12.0) * 0.5 + 0.5;
      float swirl2 = sin(angle * 7.0 + t * 0.5 - r * 20.0) * 0.5 + 0.5;
      col *= 0.6 + 0.4 * swirl;
      col += 0.1 * swirl2 * vec3(0.05, 0.58, 0.53);

      // Brightness falloff
      float ring = smoothstep(RING_INNER, RING_INNER + 0.08, r) *
                   smoothstep(RING_OUTER, RING_OUTER - 0.1, r);
      col *= ring;

      return col;
    }

    // Gravitational lensing distortion
    vec2 lensDistort(vec2 uv, vec2 center, float mass) {
      vec2 diff = uv - center;
      float dist = length(diff);
      if (dist < 0.001) return uv;
      // Deflection angle ~ mass / dist (simplified)
      float deflection = mass / (dist * dist + 0.02);
      deflection = min(deflection, 2.0);
      return uv + normalize(diff) * deflection * 0.015;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution;
      float aspect = uResolution.x / uResolution.y;
      vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);

      // Black hole center (slightly offset for composition)
      vec2 bhCenter = vec2(0.15, 0.1);
      float t = uTime;

      // Distance from black hole
      vec2 diff = centered - bhCenter;
      float dist = length(diff);
      float angle = atan(diff.y, diff.x);

      // ── Stars (behind everything, lensed) ──
      vec2 lensedUV = lensDistort(centered, bhCenter, 0.8);
      float s = stars(lensedUV + vec2(t * 0.005), 80.0);
      s += stars(lensedUV * 1.5 + vec2(t * 0.003, -t * 0.002), 120.0) * 0.6;

      // Einstein ring glow (photon sphere)
      float einsteinR = 0.15;
      float einsteinGlow = exp(-pow((dist - einsteinR) * 15.0, 2.0)) * 0.4;
      vec3 einsteinCol = vec3(0.7, 0.85, 1.0);

      // ── Accretion disk ──
      // Tilt: simulate viewing at an angle by squashing Y
      vec2 diskUV = diff;
      diskUV.y *= 2.8; // tilt factor
      float diskDist = length(diskUV);
      float diskAngle = atan(diskUV.y, diskUV.x);

      vec3 disk = diskColor(diskDist, diskAngle, t);

      // The disk goes behind the black hole (top half dimmed)
      float behindBH = smoothstep(-0.02, 0.03, diff.y);
      // Front part of disk is brighter
      disk *= mix(0.3, 1.0, behindBH);

      // Doppler shift: approaching side brighter
      float doppler = 1.0 + 0.4 * sin(diskAngle - t * 0.3);
      disk *= doppler;

      // ── Black hole shadow ──
      float shadow = smoothstep(BH_RADIUS + 0.02, BH_RADIUS - 0.01, dist);

      // ── Compose ──
      vec3 col = vec3(0.0);

      // Stars
      col += s * vec3(0.8, 0.85, 1.0) * (1.0 - shadow);

      // Dim stars near the disk
      float nearDisk = smoothstep(RING_OUTER + 0.1, RING_INNER, diskDist);
      col *= 1.0 - nearDisk * 0.7;

      // Einstein ring
      col += einsteinCol * einsteinGlow * (1.0 - shadow);

      // Accretion disk
      col += disk * 1.5;

      // Black hole (pure black center)
      col *= (1.0 - shadow);

      // Subtle vignette
      float vig = 1.0 - length(uv - 0.5) * 0.8;
      col *= vig;

      // Very subtle overall glow from disk
      col += vec3(0.05, 0.03, 0.01) * smoothstep(0.8, 0.0, dist) * 0.2;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

const quad = new THREE.Mesh(geo, mat);
scene.add(quad);

// Mouse parallax
let targetMouse = new THREE.Vector2(0.5, 0.5);
document.addEventListener('mousemove', (e) => {
  targetMouse.x = e.clientX / window.innerWidth;
  targetMouse.y = 1.0 - e.clientY / window.innerHeight;
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  mat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  mat.uniforms.uTime.value = clock.getElapsedTime();
  // Smooth mouse
  mat.uniforms.uMouse.value.lerp(targetMouse, 0.05);
  renderer.render(scene, camera);
}
animate();
