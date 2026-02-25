import * as THREE from 'three';

const canvas = document.getElementById('stars-bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 5);

const STAR_COUNT = 2000;
const starGeo = new THREE.BufferGeometry();
const positions = new Float32Array(STAR_COUNT * 3);
const sizes = new Float32Array(STAR_COUNT);

for (let i = 0; i < STAR_COUNT; i++) {
  positions[i * 3]     = (Math.random() - 0.5) * 600;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 600;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 600;
  sizes[i] = Math.random() * 2 + 0.5;
}

starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const starMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    attribute float size;
    uniform float uTime;
    varying float vAlpha;
    void main() {
      vec3 pos = position;
      pos.z = mod(pos.z + uTime * 10.0, 600.0) - 300.0;
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (200.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
      float dist = length(pos.xy);
      vAlpha = smoothstep(300.0, 50.0, dist) * (0.5 + 0.5 * sin(uTime * 2.0 + pos.x));
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
      gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

scene.add(new THREE.Points(starGeo, starMat));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  starMat.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
}
animate();
