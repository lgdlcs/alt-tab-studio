import * as THREE from 'three';

const canvas = document.getElementById('blackhole-bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Full-screen quad with Schwarzschild black hole ray-tracer
const geo = new THREE.PlaneGeometry(2, 2);
const mat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  },
  vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
  fragmentShader: `
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;

    #define PI 3.14159265359
    #define MAX_STEPS 128
    #define BH_MASS 1.0
    #define RS 2.0 * BH_MASS          // Schwarzschild radius
    #define DISK_INNER 3.0 * RS       // ISCO
    #define DISK_OUTER 12.0 * RS
    #define DISK_HALF_THICK 0.05

    // ── Pseudo-random ────────────────────────────
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    // ── Star field ───────────────────────────────
    float starField(vec3 dir) {
      // Project direction to 2D
      float theta = acos(dir.y);
      float phi = atan(dir.z, dir.x);
      vec2 uv = vec2(phi / (2.0 * PI), theta / PI);
      
      float s = 0.0;
      // Multiple layers of stars
      for (float scale = 80.0; scale <= 200.0; scale += 60.0) {
        vec2 id = floor(uv * scale);
        vec2 f = fract(uv * scale);
        float h = hash(id);
        if (h > 0.92) {
          vec2 center = vec2(hash(id + 1.0), hash(id + 2.0));
          float d = length(f - center);
          float brightness = h * h;
          float size = 0.02 + 0.03 * hash(id + 3.0);
          s += smoothstep(size, 0.0, d) * brightness;
        }
      }
      return s;
    }

    // ── Accretion disk ───────────────────────────
    vec4 accretionDisk(vec3 pos, float t) {
      // Disk lies in XZ plane (y=0), tilted
      float y = pos.y;
      if (abs(y) > DISK_HALF_THICK) return vec4(0.0);

      float r = length(pos.xz);
      if (r < DISK_INNER || r > DISK_OUTER) return vec4(0.0);

      // Radial temperature gradient
      float temp = 1.0 - (r - DISK_INNER) / (DISK_OUTER - DISK_INNER);
      temp = pow(temp, 0.6);

      // Color: inner white-hot → orange → teal outer
      vec3 white = vec3(1.0, 0.97, 0.92);
      vec3 orange = vec3(0.95, 0.5, 0.1);
      vec3 teal = vec3(0.05, 0.58, 0.53);
      
      vec3 col;
      if (temp > 0.6) {
        col = mix(orange, white, (temp - 0.6) / 0.4);
      } else {
        col = mix(teal, orange, temp / 0.6);
      }

      // Swirl pattern
      float angle = atan(pos.z, pos.x);
      float swirl = sin(angle * 4.0 - t * 0.5 + r * 2.0) * 0.5 + 0.5;
      float swirl2 = sin(angle * 8.0 + t * 0.3 - r * 3.5) * 0.5 + 0.5;
      col *= 0.7 + 0.3 * swirl;
      col += 0.05 * swirl2 * teal;

      // Doppler: approaching side brighter (rotation around Y)
      float doppler = 1.0 + 0.3 * sin(angle + t * 0.2);
      col *= doppler;

      // Edge softness
      float edge = smoothstep(DISK_INNER, DISK_INNER + 0.5, r) *
                   smoothstep(DISK_OUTER, DISK_OUTER - 1.5, r);
      float yFade = 1.0 - abs(y) / DISK_HALF_THICK;

      float alpha = edge * yFade * (0.8 + 0.2 * temp);

      return vec4(col * (1.0 + temp * 2.0), alpha);
    }

    // ── Gravitational ray bending ────────────────
    // Simulate photon geodesic in Schwarzschild spacetime
    // Using Euler integration of the deflection
    void traceRay(vec3 ro, vec3 rd, float t, out vec3 color, out float alpha) {
      color = vec3(0.0);
      alpha = 0.0;

      vec3 pos = ro;
      vec3 vel = rd;
      float dt = 0.15;

      for (int i = 0; i < MAX_STEPS; i++) {
        float r = length(pos);

        // Captured by black hole
        if (r < RS * 1.01) {
          color = vec3(0.0);
          alpha = 1.0;
          return;
        }

        // Escaped to star field
        if (r > 60.0) {
          float s = starField(normalize(vel));
          vec3 starCol = vec3(0.7, 0.8, 1.0) * s;
          color += starCol * (1.0 - alpha);
          return;
        }

        // Check accretion disk intersection
        vec4 diskSample = accretionDisk(pos, t);
        if (diskSample.a > 0.01) {
          color += diskSample.rgb * diskSample.a * (1.0 - alpha);
          alpha += diskSample.a * (1.0 - alpha);
          if (alpha > 0.95) return;
        }

        // Gravitational acceleration (Newtonian approx of Schwarzschild geodesic)
        // a = -1.5 * RS * h^2 / r^5 * pos  (effective potential)
        // Simplified: deflection proportional to RS/r^2
        float r2 = r * r;
        float r3 = r2 * r;
        vec3 accel = -1.5 * RS * pos / r3;

        // Extra term for proper photon orbit behavior
        vec3 h = cross(pos, vel);
        float h2 = dot(h, h);
        accel += -1.5 * RS * h2 / (r2 * r3) * pos;

        vel += accel * dt;
        pos += vel * dt;
      }

      // Didn't converge — use star field
      float s = starField(normalize(vel));
      color += vec3(0.7, 0.8, 1.0) * s * (1.0 - alpha);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

      float t = uTime;

      // Camera setup — slightly above the disk plane, looking at BH
      vec3 camPos = vec3(0.0, 3.0, 25.0);
      vec3 target = vec3(0.0, 0.0, 0.0);
      vec3 fwd = normalize(target - camPos);
      vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
      vec3 up = cross(right, fwd);

      float fov = 0.8;
      vec3 rd = normalize(fwd + uv.x * right * fov + uv.y * up * fov);

      vec3 col;
      float alpha;
      traceRay(camPos, rd, t, col, alpha);

      // Photon ring glow: boost brightness near the critical orbit
      // (already handled implicitly by the ray tracing)

      // Tone mapping
      col = col / (1.0 + col); // Reinhard
      col = pow(col, vec3(0.9)); // slight gamma

      // Subtle vignette
      float vig = 1.0 - 0.3 * length(uv);
      col *= vig;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

const quad = new THREE.Mesh(geo, mat);
scene.add(quad);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  mat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  mat.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
}
animate();
