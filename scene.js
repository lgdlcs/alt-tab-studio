import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// ─── Setup ───────────────────────────────────────────
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const isMobile = window.innerWidth < 768;
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, isMobile ? 7.5 : 5);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ─── State ───────────────────────────────────────────
let currentZone = 'intro'; // 'intro' | 'warping' | 'work'
let warpProgress = 0;

// ─── Stars ───────────────────────────────────────────
const STAR_COUNT = 3000;
const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(STAR_COUNT * 3);
const starSizes = new Float32Array(STAR_COUNT);

for (let i = 0; i < STAR_COUNT; i++) {
  starPositions[i * 3]     = (Math.random() - 0.5) * 600;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 600;
  starPositions[i * 3 + 2] = (Math.random() - 0.5) * 600;
  starSizes[i] = Math.random() * 2 + 0.5;
}

starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

const starMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uWarp: { value: 0 },
  },
  vertexShader: `
    attribute float size;
    uniform float uTime;
    uniform float uWarp;
    varying float vAlpha;
    void main() {
      vec3 pos = position;
      // Warp: stretch stars along Z toward camera
      float stretch = 1.0 + uWarp * 40.0;
      pos.z = mod(pos.z + uTime * 10.0 + uWarp * uTime * 200.0, 600.0) - 300.0;
      
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (200.0 / -mvPos.z) * (1.0 + uWarp * 3.0);
      gl_Position = projectionMatrix * mvPos;
      
      // Fade based on distance
      float dist = length(pos.xy);
      vAlpha = smoothstep(300.0, 50.0, dist) * (0.5 + 0.5 * sin(uTime * 2.0 + pos.x));
      vAlpha = mix(vAlpha, 1.0, uWarp);
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    uniform float uWarp;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
      vec3 color = mix(vec3(1.0), vec3(0.05, 0.58, 0.53), uWarp * 0.5);
      gl_FragColor = vec4(color, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// ─── Anomaly (clickable object) ──────────────────────
const anomalyGeo = new THREE.IcosahedronGeometry(0.35, 1);
const anomalyMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vPos;
    void main() {
      vNormal = normal;
      vPos = position;
      vec3 pos = position;
      pos += normal * sin(uTime * 3.0 + position.y * 5.0) * 0.05;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vPos;
    void main() {
      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
      vec3 teal = vec3(0.05, 0.58, 0.53);
      vec3 white = vec3(1.0);
      vec3 col = mix(teal, white, fresnel * 0.6);
      float pulse = 0.7 + 0.3 * sin(uTime * 2.0);
      gl_FragColor = vec4(col, fresnel * pulse + 0.15);
    }
  `,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const anomaly = new THREE.Mesh(anomalyGeo, anomalyMat);
anomaly.position.set(isMobile ? 0.8 : 1.8, isMobile ? -1.2 : 0.5, 0);
scene.add(anomaly);

// Glow ring around anomaly
const ringGeo = new THREE.RingGeometry(0.5, 0.65, 32);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0x0d9488,
  transparent: true,
  opacity: 0.15,
  side: THREE.DoubleSide,
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.position.copy(anomaly.position);
scene.add(ring);

// ─── 3D Title Text ──────────────────────────────────
let titleGroup = new THREE.Group();
scene.add(titleGroup);

const fontLoader = new FontLoader();
fontLoader.load('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/fonts/helvetiker_bold.typeface.json', (font) => {
  const matWhite = new THREE.MeshBasicMaterial({ color: 0xfafafa, transparent: true, opacity: 0.95 });
  const matTeal = new THREE.MeshBasicMaterial({ color: 0x0d9488, transparent: true, opacity: 0.95 });

  const textSize = isMobile ? 0.35 : 0.55;
  const textOpts = {
    font,
    size: textSize,
    depth: 0.06,
    curveSegments: 12,
    bevelEnabled: false,
  };

  // "Alt Tab"
  const geo1 = new TextGeometry('Alt Tab', textOpts);
  geo1.computeBoundingBox();
  const w1 = geo1.boundingBox.max.x - geo1.boundingBox.min.x;
  const mesh1 = new THREE.Mesh(geo1, matWhite);
  mesh1.position.set(-w1 / 2, 0.3, 0);

  // "Studio"
  const geo2 = new TextGeometry('Studio', textOpts);
  geo2.computeBoundingBox();
  const w2 = geo2.boundingBox.max.x - geo2.boundingBox.min.x;
  const mesh2 = new THREE.Mesh(geo2, matTeal);
  mesh2.position.set(-w2 / 2, isMobile ? -0.3 : -0.45, 0);

  titleGroup.add(mesh1, mesh2);

  if (isMobile) {
    titleGroup.position.set(-0.5, 0.8, 0);
    titleGroup.rotation.y = 0.08;
  } else {
    titleGroup.position.set(-0.8, 0.2, 0);
    titleGroup.rotation.y = 0.12;
  }
});

// ─── Ambient light for depth ────────────────────────
const ambientLight = new THREE.AmbientLight(0x0d9488, 0.3);
scene.add(ambientLight);

// ─── Interaction ─────────────────────────────────────
let hovered = false;

canvas.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  if (currentZone !== 'intro') return;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(anomaly);
  const isHover = hits.length > 0;
  if (isHover !== hovered) {
    hovered = isHover;
    canvas.style.cursor = hovered ? 'pointer' : 'default';
    anomaly.scale.setScalar(hovered ? 1.3 : 1);
  }
});

canvas.addEventListener('click', () => {
  if (currentZone !== 'intro' || !hovered) return;
  startWarp();
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
  if (currentZone !== 'intro') return;
  const t = e.touches[0];
  mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(anomaly);
  if (hits.length > 0) startWarp();
}, { passive: true });

// ─── Warp transition ────────────────────────────────
function startWarp() {
  currentZone = 'warping';
  document.getElementById('hint').classList.add('hidden');
  document.getElementById('zone-intro').classList.remove('zone-active');

  // Immediately remove anomaly + ring
  scene.remove(anomaly);
  scene.remove(ring);
  // Immediately remove title
  scene.remove(titleGroup);
}

// ─── Resize ──────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (currentZone === 'intro') {
    camera.position.z = window.innerWidth < 768 ? 7.5 : 5;
  }
});

// ─── Subtle camera parallax ─────────────────────────
let targetCamX = 0, targetCamY = 0;
document.addEventListener('mousemove', (e) => {
  targetCamX = ((e.clientX / window.innerWidth) - 0.5) * 0.8;
  targetCamY = ((e.clientY / window.innerHeight) - 0.5) * -0.4;
});

// ─── Animation loop ─────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  // Update uniforms
  starMat.uniforms.uTime.value = t;
  if (anomalyMat.uniforms) anomalyMat.uniforms.uTime.value = t;

  // Anomaly rotation
  if (anomaly.parent) {
    anomaly.rotation.y = t * 0.5;
    anomaly.rotation.x = Math.sin(t * 0.3) * 0.2;
    ring.rotation.z = t * 0.2;
    ring.material.opacity = 0.1 + 0.08 * Math.sin(t * 1.5);
  }

  // Camera parallax
  camera.position.x += (targetCamX - camera.position.x) * 0.03;
  camera.position.y += (targetCamY - camera.position.y) * 0.03;

  // Warp logic
  if (currentZone === 'warping') {
    warpProgress = Math.min(warpProgress + 0.008, 1);
    starMat.uniforms.uWarp.value = easeInOutCubic(warpProgress);

    if (warpProgress >= 1) {
      currentZone = 'work';
      starMat.uniforms.uWarp.value = 0;
      // Transition to zone-work + show navbar, canvas goes behind
      document.getElementById('zone-work').classList.add('zone-active');
      document.getElementById('navbar').classList.remove('hidden');
      canvas.classList.add('behind');
      // Slow down stars for ambient background
      starMat.uniforms.uWarp.value = 0;
    }
  }

  renderer.render(scene, camera);
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

animate();
