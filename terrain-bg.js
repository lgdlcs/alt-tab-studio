import * as THREE from 'three';

// ─── Immediate setup (renders dark scene before terrain loads) ───
const canvas = document.getElementById('terrain-bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000508);
scene.fog = new THREE.FogExp2(0x000508, 0.01);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);

// Lights — warm natural tones with subtle teal accent
scene.add(new THREE.AmbientLight(0x334433, 1.2));
const l1 = new THREE.DirectionalLight(0xffeedd, 1.0);
l1.position.set(30, 60, 30);
scene.add(l1);
const l2 = new THREE.DirectionalLight(0x88aacc, 0.5);
l2.position.set(-30, 50, -20);
scene.add(l2);

// ─── Geographic config ──────────────────────────────
const GRID = 512;
const SIZE = 100;
const exag = 3.0;

const LAT_MIN = 45.76, LAT_MAX = 45.96;
const LON_MIN = 6.00, LON_MAX = 6.32;
const LAT_RANGE = LAT_MAX - LAT_MIN;
const LON_RANGE = LON_MAX - LON_MIN;
const COS_LAT = Math.cos(((LAT_MIN + LAT_MAX) / 2) * Math.PI / 180);
const REAL_WIDTH_KM = LON_RANGE * 111.32 * COS_LAT;
const REAL_HEIGHT_KM = LAT_RANGE * 110.57;
const ASPECT = REAL_WIDTH_KM / REAL_HEIGHT_KM;
const SIZE_X = SIZE * ASPECT;
const SIZE_Z = SIZE;

const ZOOM = 12;
const TILE_X_MIN = 2116, TILE_X_MAX = 2119;
const TILE_Y_MIN = 1457, TILE_Y_MAX = 1461;
const TILE_SIZE = 256;
const CANVAS_W = (TILE_X_MAX - TILE_X_MIN + 1) * TILE_SIZE;
const CANVAS_H = (TILE_Y_MAX - TILE_Y_MIN + 1) * TILE_SIZE;

const LAKE_ELEV = 447;
const HEIGHT_SCALE = 35;

// ─── Tile loading ───────────────────────────────────
function tileToLon(x, z) { return x / Math.pow(2, z) * 360 - 180; }
function tileToLat(y, z) {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function fetchTile(tx, ty) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ img, tx, ty });
    img.onerror = () => reject(new Error(`Tile ${tx},${ty} failed`));
    img.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZOOM}/${tx}/${ty}.png`;
  });
}

async function loadTerrain() {
  const promises = [];
  for (let ty = TILE_Y_MIN; ty <= TILE_Y_MAX; ty++) {
    for (let tx = TILE_X_MIN; tx <= TILE_X_MAX; tx++) {
      promises.push(fetchTile(tx, ty));
    }
  }
  const tiles = await Promise.all(promises);

  const stitchCanvas = document.createElement('canvas');
  stitchCanvas.width = CANVAS_W;
  stitchCanvas.height = CANVAS_H;
  const ctx = stitchCanvas.getContext('2d');
  for (const { img, tx, ty } of tiles) {
    ctx.drawImage(img, (tx - TILE_X_MIN) * TILE_SIZE, (ty - TILE_Y_MIN) * TILE_SIZE);
  }

  const tileLonMin = tileToLon(TILE_X_MIN, ZOOM);
  const tileLonMax = tileToLon(TILE_X_MAX + 1, ZOOM);
  const tileLatMax = tileToLat(TILE_Y_MIN, ZOOM);
  const tileLatMin = tileToLat(TILE_Y_MAX + 1, ZOOM);

  const cropX = Math.round((LON_MIN - tileLonMin) / (tileLonMax - tileLonMin) * CANVAS_W);
  const cropY = Math.round((tileLatMax - LAT_MAX) / (tileLatMax - tileLatMin) * CANVAS_H);
  const cropW = Math.round(LON_RANGE / (tileLonMax - tileLonMin) * CANVAS_W);
  const cropH = Math.round(LAT_RANGE / (tileLatMax - tileLatMin) * CANVAS_H);

  const imageData = ctx.getImageData(cropX, cropY, cropW, cropH);
  const pixels = imageData.data;

  const elevations = new Float32Array(GRID * GRID);
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const srcX = Math.min(Math.floor(col / (GRID - 1) * (cropW - 1)), cropW - 1);
      const srcY = Math.min(Math.floor((1 - row / (GRID - 1)) * (cropH - 1)), cropH - 1);
      const idx = (srcY * cropW + srcX) * 4;
      elevations[row * GRID + col] = (pixels[idx] * 256 + pixels[idx + 1] + pixels[idx + 2] / 256) - 32768;
    }
  }
  return elevations;
}

// ─── Geo → scene coordinates ────────────────────────
function geoToScene(lat, lon) {
  const nx = (lon - LON_MIN) / LON_RANGE;
  const nz = (lat - LAT_MIN) / LAT_RANGE;
  return {
    x: (nx - 0.5) * SIZE_X,
    z: -(nz - 0.5) * SIZE_Z,
  };
}

// ─── Mouse parallax ─────────────────────────────────
let targetPX = 0, targetPY = 0, pX = 0, pY = 0;
document.addEventListener('mousemove', (e) => {
  targetPX = ((e.clientX / window.innerWidth) - 0.5) * 6;
  targetPY = ((e.clientY / window.innerHeight) - 0.5) * -3;
});

// ─── Animation state (populated by init) ────────────
const anim = {};

// ─── Animation loop (starts immediately) ────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Camera orbit + parallax (always runs)
  pX += (targetPX - pX) * 0.02;
  pY += (targetPY - pY) * 0.02;
  const angle = t * 0.03;
  camera.position.x = Math.sin(angle) * 70 + pX;
  camera.position.y = 48 + pY;
  camera.position.z = Math.cos(angle) * 70;
  camera.lookAt(0, 5, 0);

  // Subtle light pulse
  l1.intensity = 1.0 + Math.sin(t * 0.5) * 0.1;
  l2.intensity = 0.5 + Math.cos(t * 0.7) * 0.08;

  // Terrain-dependent animations
  if (anim.ready) {
    // Marker diamond rotation
    anim.diamond.rotation.y = t * 0.8;
    anim.diamond.rotation.x = Math.sin(t * 0.3) * 0.2;
    anim.diamondSolid.rotation.y = -t * 0.5;

    // Pulse ring expansion
    const pulse = (t * 0.5) % 1;
    anim.pulseRing.scale.setScalar(1 + pulse * 2.5);
    anim.pulseRingMat.opacity = 0.2 * (1 - pulse);

    // Beam shimmer
    anim.beamMat.opacity = 0.25 + Math.sin(t * 2) * 0.1;

    // Particles
    const pa = anim.particles.geometry.attributes.position.array;
    for (let i = 0; i < anim.N; i++) {
      pa[i * 3 + 1] += anim.speeds[i];
      if (pa[i * 3 + 1] > 65) pa[i * 3 + 1] = -3;
    }
    anim.particles.geometry.attributes.position.needsUpdate = true;

    // Scan line
    anim.scanLine.position.z = Math.sin(t * 0.2) * SIZE_Z * 0.55;
    anim.scanLine.position.y = 0.5;

    // Water shimmer
    anim.waterMat.opacity = 0.33 + Math.sin(t * 1.5) * 0.03;
  }

  renderer.render(scene, camera);
}

animate();

// ─── Async terrain loading ──────────────────────────
async function init() {
  const elevations = await loadTerrain();

  // Find min/max
  let minE = Infinity, maxE = -Infinity;
  for (let i = 0; i < elevations.length; i++) {
    if (elevations[i] < minE) minE = elevations[i];
    if (elevations[i] > maxE) maxE = elevations[i];
  }
  const range = maxE - minE;

  // ─── Terrain mesh ──────────────────────────────────
  const geo = new THREE.PlaneGeometry(SIZE_X, SIZE_Z, GRID - 1, GRID - 1);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const n = (elevations[i] - minE) / range;
    pos.setZ(i, n * HEIGHT_SCALE * exag);

    const elev = elevations[i];
    if (elev <= LAKE_ELEV) {
      colors[i * 3] = 0.01;
      colors[i * 3 + 1] = 0.12 + n * 0.3;
      colors[i * 3 + 2] = 0.25 + n * 0.15;
    } else if (elev <= 800) {
      const t = (elev - LAKE_ELEV) / (800 - LAKE_ELEV);
      colors[i * 3] = 0.04 + t * 0.03;
      colors[i * 3 + 1] = 0.18 + t * 0.12;
      colors[i * 3 + 2] = 0.06 + t * 0.04;
    } else if (elev <= 1500) {
      const t = (elev - 800) / (1500 - 800);
      colors[i * 3] = 0.07 + t * 0.1;
      colors[i * 3 + 1] = 0.30 - t * 0.08;
      colors[i * 3 + 2] = 0.10 + t * 0.05;
    } else if (elev <= 2000) {
      const t = (elev - 1500) / (2000 - 1500);
      colors[i * 3] = 0.17 + t * 0.15;
      colors[i * 3 + 1] = 0.22 + t * 0.12;
      colors[i * 3 + 2] = 0.15 + t * 0.15;
    } else {
      const t = Math.min((elev - 2000) / 400, 1);
      colors[i * 3] = 0.32 + t * 0.45;
      colors[i * 3 + 1] = 0.34 + t * 0.45;
      colors[i * 3 + 2] = 0.30 + t * 0.50;
    }
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const terrainMat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    shininess: 30,
    specular: new THREE.Color(0x225544),
    side: THREE.DoubleSide,
  });
  const terrain = new THREE.Mesh(geo, terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  scene.add(terrain);

  // ─── Wireframe overlay ────────────────────────────
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x0d9488, wireframe: true, transparent: true, opacity: 0.04,
  });
  const wire = new THREE.Mesh(geo, wireMat);
  wire.rotation.x = -Math.PI / 2;
  wire.position.y = 0.05;
  scene.add(wire);

  // ─── Water plane ──────────────────────────────────
  const lakeNorm = (LAKE_ELEV - minE) / range;
  const waterLevel = lakeNorm * HEIGHT_SCALE * exag + 0.15;
  const waterGeo = new THREE.PlaneGeometry(SIZE_X, SIZE_Z);
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x0a2233, transparent: true, opacity: 0.35,
    shininess: 200, specular: new THREE.Color(0x336655), side: THREE.DoubleSide,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = waterLevel;
  scene.add(water);

  // ─── Marker at Annecy city center ─────────────────
  const { x: mx, z: mz } = geoToScene(45.8992, 6.1294);
  const markerBaseY = waterLevel + 0.3;
  const beamHeight = 32;
  const markerGroup = new THREE.Group();

  // Vertical beam
  const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, beamHeight, 6);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x0d9488, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = beamHeight / 2;
  markerGroup.add(beam);

  // Top diamond (wireframe)
  const diamondGeo = new THREE.OctahedronGeometry(1.2, 0);
  const diamondMat = new THREE.MeshBasicMaterial({
    color: 0x0d9488, wireframe: true, transparent: true, opacity: 0.7,
  });
  const diamond = new THREE.Mesh(diamondGeo, diamondMat);
  diamond.position.y = beamHeight + 1.5;
  markerGroup.add(diamond);

  // Diamond inner glow
  const diamondSolidMat = new THREE.MeshBasicMaterial({
    color: 0x0d9488, transparent: true, opacity: 0.15,
    blending: THREE.AdditiveBlending,
  });
  const diamondSolid = new THREE.Mesh(diamondGeo, diamondSolidMat);
  diamondSolid.position.y = beamHeight + 1.5;
  diamondSolid.scale.setScalar(0.8);
  markerGroup.add(diamondSolid);

  // Base ring (static)
  const baseRingGeo = new THREE.RingGeometry(1.5, 2.2, 32);
  const baseRingMat = new THREE.MeshBasicMaterial({
    color: 0x0d9488, transparent: true, opacity: 0.25,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.1;
  markerGroup.add(baseRing);

  // Pulse ring (expanding animation)
  const pulseRingGeo = new THREE.RingGeometry(1.8, 2.3, 32);
  const pulseRingMat = new THREE.MeshBasicMaterial({
    color: 0x0d9488, transparent: true, opacity: 0.2,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.y = 0.1;
  markerGroup.add(pulseRing);

  markerGroup.position.set(mx, markerBaseY, mz);
  scene.add(markerGroup);

  // Marker label
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 96;
  const lctx = labelCanvas.getContext('2d');
  lctx.fillStyle = 'rgba(13, 148, 136, 0.9)';
  lctx.font = '700 24px Inter, sans-serif';
  lctx.textAlign = 'center';
  lctx.fillText('ALT TAB STUDIO', 256, 36);
  lctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  lctx.font = '400 15px Inter, sans-serif';
  lctx.fillText('ANNECY \u00B7 45.899\u00B0N \u00B7 6.129\u00B0E', 256, 60);
  lctx.strokeStyle = 'rgba(13, 148, 136, 0.25)';
  lctx.lineWidth = 1;
  lctx.beginPath();
  lctx.moveTo(140, 68);
  lctx.lineTo(372, 68);
  lctx.stroke();

  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false })
  );
  labelSprite.position.set(mx, markerBaseY + beamHeight + 5, mz);
  labelSprite.scale.set(20, 4, 1);
  scene.add(labelSprite);

  // ─── Subtle geographic labels ─────────────────────
  function geoLabel(text, lat, lon, op) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = `rgba(0,255,200,${op})`;
    ctx.font = '500 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 36);
    const tex = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
    );
    const { x, z } = geoToScene(lat, lon);
    s.position.set(x, 28, z);
    s.scale.set(14, 1.8, 1);
    scene.add(s);
  }

  geoLabel('LAC D\'ANNECY', 45.855, 6.165, 0.2);
  geoLabel('LA TOURNETTE \u00B7 2351m', 45.8203, 6.2717, 0.18);
  geoLabel('SEMNOZ', 45.8256, 6.0689, 0.15);

  // ─── Particles ────────────────────────────────────
  const N = 2000;
  const pp = new Float32Array(N * 3);
  const speeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pp[i * 3] = (Math.random() - 0.5) * 130;
    pp[i * 3 + 1] = Math.random() * 65;
    pp[i * 3 + 2] = (Math.random() - 0.5) * 130;
    speeds[i] = 0.01 + Math.random() * 0.04;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0x0d9488, size: 0.12, transparent: true, opacity: 0.2,
    blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  scene.add(particles);

  // ─── Scan line ────────────────────────────────────
  const slPts = [new THREE.Vector3(-SIZE_X * 0.6, 0, 0), new THREE.Vector3(SIZE_X * 0.6, 0, 0)];
  const slGeo = new THREE.BufferGeometry().setFromPoints(slPts);
  const scanLine = new THREE.Line(slGeo, new THREE.LineBasicMaterial({
    color: 0x0d9488, transparent: true, opacity: 0.08,
  }));
  scene.add(scanLine);

  // ─── Populate animation state ─────────────────────
  anim.diamond = diamond;
  anim.diamondSolid = diamondSolid;
  anim.pulseRing = pulseRing;
  anim.pulseRingMat = pulseRingMat;
  anim.beamMat = beamMat;
  anim.waterMat = waterMat;
  anim.particles = particles;
  anim.speeds = speeds;
  anim.N = N;
  anim.scanLine = scanLine;
  anim.ready = true;

  // Signal terrain loaded
  const loadingEl = document.getElementById('terrain-loading');
  if (loadingEl) {
    loadingEl.style.opacity = '0';
    setTimeout(() => loadingEl.remove(), 600);
  }
}

// ─── Resize ─────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Go ─────────────────────────────────────────────
init().catch(err => {
  console.error('Terrain loading failed:', err);
  const el = document.getElementById('terrain-loading');
  if (el) el.textContent = '';
});
