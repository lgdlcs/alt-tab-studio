import * as THREE from 'three';

const canvas = document.getElementById('blackhole-bg');
const isMobile = window.innerWidth < 768;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile });
// Half resolution on mobile for performance
const pixelRatio = isMobile ? 1 : Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const STEPS = isMobile ? 64 : 100;

const geo = new THREE.PlaneGeometry(2, 2);
const mat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(
      window.innerWidth * pixelRatio,
      window.innerHeight * pixelRatio
    ) },
  },
  vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
  fragmentShader: `
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;

    #define PI 3.14159265359
    #define STEPS ${STEPS}
    #define RS 2.0                     // Schwarzschild radius
    #define PHOTON_R 1.5 * RS          // Photon sphere
    #define DISK_INNER 3.0             // ISCO (3 * RS)
    #define DISK_OUTER 14.0
    #define DISK_HALF 0.15             // Half-thickness

    // ── Hash ─────────────────────────────────────
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    // ── Stars ────────────────────────────────────
    float stars(vec3 dir) {
      float theta = acos(clamp(dir.y, -1.0, 1.0));
      float phi = atan(dir.z, dir.x);
      vec2 uv = vec2(phi / (2.0 * PI) + 0.5, theta / PI);

      float s = 0.0;
      for (float i = 0.0; i < 3.0; i++) {
        float scale = 60.0 + i * 50.0;
        vec2 cell = floor(uv * scale);
        vec2 f = fract(uv * scale);
        float h = hash(cell + i * 100.0);
        if (h > 0.9) {
          vec2 p = vec2(hash(cell + i * 200.0), hash(cell + i * 300.0));
          float d = length(f - p);
          float r = 0.01 + 0.02 * hash(cell + i * 400.0);
          s += smoothstep(r, 0.0, d) * (0.5 + 0.5 * h);
        }
      }
      return s;
    }

    // ── Accretion disk ───────────────────────────
    // Disk in the XZ plane (y ≈ 0)
    vec3 diskColor(vec3 pos, float t) {
      float r = length(pos.xz);
      if (r < DISK_INNER || r > DISK_OUTER) return vec3(0.0);
      if (abs(pos.y) > DISK_HALF) return vec3(0.0);

      // Temperature: hotter near center
      float temp = 1.0 - (r - DISK_INNER) / (DISK_OUTER - DISK_INNER);
      temp = pow(clamp(temp, 0.0, 1.0), 0.5);

      // Color gradient
      vec3 hot = vec3(1.0, 0.95, 0.85);
      vec3 warm = vec3(1.0, 0.55, 0.12);
      vec3 cool = vec3(0.05, 0.58, 0.53);

      vec3 col = temp > 0.5
        ? mix(warm, hot, (temp - 0.5) * 2.0)
        : mix(cool, warm, temp * 2.0);

      // Swirl
      float angle = atan(pos.z, pos.x);
      float swirl = 0.7 + 0.3 * sin(angle * 5.0 - t * 0.4 + r * 1.5);
      col *= swirl;

      // Doppler shift (approaching side brighter)
      col *= 1.0 + 0.35 * sin(angle + PI * 0.25);

      // Edge falloff
      float radialFade = smoothstep(DISK_INNER, DISK_INNER + 1.0, r) *
                         smoothstep(DISK_OUTER, DISK_OUTER - 2.0, r);
      float vertFade = 1.0 - smoothstep(0.0, DISK_HALF, abs(pos.y));

      // Brightness boost for inner region
      float brightness = 1.0 + temp * 3.0;

      return col * radialFade * vertFade * brightness;
    }

    // ── Ray tracer ───────────────────────────────
    // Schwarzschild geodesic: d²r/dλ² = -1.5 * RS * L² / r⁴
    // where L = |r × v| is the specific angular momentum
    vec3 trace(vec3 ro, vec3 rd, float t) {
      vec3 pos = ro;
      vec3 vel = normalize(rd);
      float stepSize = 0.3;
      vec3 col = vec3(0.0);
      float diskAlpha = 0.0;

      for (int i = 0; i < STEPS; i++) {
        float r = length(pos);

        // Adaptive step size: smaller near the BH
        stepSize = max(0.05, 0.15 * r / PHOTON_R);

        // Captured
        if (r < RS * 0.95) {
          return col;
        }

        // Escaped
        if (r > 70.0) {
          float s = stars(normalize(vel));
          col += vec3(0.65, 0.7, 0.9) * s * (1.0 - diskAlpha);
          return col;
        }

        // Disk check (only when near the plane)
        if (abs(pos.y) < DISK_HALF * 1.5) {
          vec3 dc = diskColor(pos, t);
          float lum = length(dc);
          if (lum > 0.01) {
            float a = min(lum * 0.5, 1.0);
            col += dc * (1.0 - diskAlpha);
            diskAlpha += a * (1.0 - diskAlpha);
            if (diskAlpha > 0.95) return col;
          }
        }

        // Gravitational deflection
        // The correct Schwarzschild photon equation:
        // acceleration = -1.5 * RS * (L²/r⁵) * pos
        // where L² = |pos × vel|²
        float r2 = r * r;
        vec3 L = cross(pos, vel);
        float L2 = dot(L, L);
        vec3 accel = -1.5 * RS * L2 / (r2 * r2 * r) * pos;

        vel += accel * stepSize;
        pos += vel * stepSize;
      }

      // Timeout: use star field
      float s = stars(normalize(vel));
      col += vec3(0.65, 0.7, 0.9) * s * (1.0 - diskAlpha);
      return col;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

      float t = uTime;

      // Camera: slightly above disk plane, offset for composition
      // BH slightly right of center so form sits on the left
      vec3 camPos = vec3(0.0, 4.0, 28.0);
      vec3 target = vec3(0.0, 0.0, 0.0);
      vec3 fwd = normalize(target - camPos);
      vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
      vec3 up = cross(right, fwd);

      float fov = 0.7;
      vec3 rd = normalize(fwd + uv.x * right * fov + uv.y * up * fov);

      vec3 col = trace(camPos, rd, t);

      // Photon ring glow — subtle bloom around photon sphere
      vec2 bhScreen = vec2(0.0, -0.04); // BH center in screen space approx
      float distToCenter = length(uv - bhScreen);
      float ringR = 0.11; // photon ring apparent radius
      float ringGlow = exp(-pow((distToCenter - ringR) * 25.0, 2.0)) * 0.15;
      col += vec3(1.0, 0.85, 0.6) * ringGlow;

      // Reinhard tone mapping
      col = col / (1.0 + col);
      col = pow(col, vec3(0.92));

      // Vignette
      float vig = 1.0 - 0.35 * dot(uv, uv);
      col *= vig;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

scene.add(new THREE.Mesh(geo, mat));

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  mat.uniforms.uResolution.value.set(
    window.innerWidth * pixelRatio,
    window.innerHeight * pixelRatio
  );
});

// Throttle on mobile: 30fps instead of 60
const targetFPS = isMobile ? 30 : 60;
const frameInterval = 1000 / targetFPS;
let lastFrame = 0;

const clock = new THREE.Clock();
function animate(now) {
  requestAnimationFrame(animate);
  if (now - lastFrame < frameInterval) return;
  lastFrame = now;
  mat.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
