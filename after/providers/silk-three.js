// Three.js take on the Providers silk ribbon — MSAA + MeshPhysicalMaterial
// (transmission + iridescence). Exposes the same tuning API as the WebGPU
// build so the ⚙ Silk panel keeps working.
import * as THREE from 'https://unpkg.com/three@0.170.0/build/three.module.js';

const SEG_U = 260;   // along the ribbon
const SEG_V = 8;     // across the width
const LEN = 26;      // world length along x
const HALF_W = 1.8;

function centerline(u, t) {
  const yc = 1.25 * Math.sin(u * 0.42 + t * 0.10) + 0.5 * Math.sin(u * 0.19 - t * 0.06 + 1.7);
  const zc = 0.35 * Math.sin(u * 0.31 + t * 0.07 + 0.8);
  return [yc, zc];
}
function twist(u, t) {
  return 1.45 * Math.sin(u * 0.27 - t * 0.08 + 0.6) + u * 0.08;
}

function buildStudioEnv(renderer) {
  // Minimal procedural studio: white dome, two long softboxes, a teal HDR strip.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const mk = (w, h, color, intensity, pos, look) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    m.material.color.multiplyScalar(intensity);
    m.position.set(...pos);
    m.lookAt(...look);
    scene.add(m);
  };
  mk(14, 3.2, new THREE.Color(0.85, 0.98, 0.95), 3.2, [6, 7, 6], [0, 0, 0]);
  mk(10, 2.4, new THREE.Color(0.86, 0.70, 0.95), 3.0, [-7, 8, 3], [0, 0, 0]);
  mk(22, 1.2, new THREE.Color(0.10, 0.95, 0.90), 9.0, [0, -4, 9], [0, 0, 0]);
  mk(16, 0.9, new THREE.Color(0.95, 0.35, 0.80), 5.0, [8, 2, -7], [0, 0, 0]);
  mk(10, 10, new THREE.Color(0.01, 0.04, 0.06), 1.0, [-9, -3, -6], [0, 0, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.08).texture;
  pmrem.dispose();
  return env;
}

export async function mountGlass(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 15.5);

  const env = buildStudioEnv(renderer);
  scene.environment = env;

  // Real rectangular cross-section: thick edges that catch the light like the WGSL canto.
  const HALF_T = 0.18;
  const RINGS = SEG_U + 1;
  const geo = new THREE.BufferGeometry();
  const verts = new Float32Array(RINGS * 4 * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  const idx = [];
  const pushSide = k => {
    for (let i = 0; i < SEG_U; i++) {
      const a = i * 4 + k, b = i * 4 + ((k + 1) % 4);
      const c = (i + 1) * 4 + k, d = (i + 1) * 4 + ((k + 1) % 4);
      idx.push(a, c, b, b, c, d);
    }
  };
  pushSide(1); pushSide(3);          // wide faces
  const faceCount = idx.length;
  pushSide(0); pushSide(2);          // thick edges
  geo.setIndex(idx);
  geo.addGroup(0, faceCount, 0);
  geo.addGroup(faceCount, idx.length - faceCount, 1);
  const faceMat = new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.27,
    depthWrite: false,
    roughness: 0.04,
    ior: 1.45,
    iridescence: 1.0,
    iridescenceIOR: 1.38,
    iridescenceThicknessRange: [330, 430],
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    side: THREE.FrontSide,
    color: new THREE.Color(0.85, 1.0, 1.0),
    envMapIntensity: 2.4,
  });
  const edgeMat = new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    roughness: 0.14,
    iridescence: 1.0,
    iridescenceIOR: 1.38,
    iridescenceThicknessRange: [330, 430],
    side: THREE.FrontSide,
    color: new THREE.Color(0.08, 0.91, 0.92),
    emissive: new THREE.Color(0.03, 0.55, 0.56),
    emissiveIntensity: 0.62,
    envMapIntensity: 2.6,
  });
  const mat = faceMat;
  const ribbon = new THREE.Mesh(geo, [faceMat, edgeMat]);
  const group = new THREE.Group();
  group.add(ribbon);
  scene.add(group);

  // Baked recipe parity with the WebGPU silk defaults.
  const tune = { roll: 0.64, ox: 2.25, oy: 5, zoom: 0.6, speed: 0.85 };
  const pose = { yaw: 0, pitch: 0 };
  const target = { yaw: 0, pitch: 0 };

  const pos = geo.attributes.position;
  function updateRibbon(t) {
    for (let i = 0; i <= SEG_U; i++) {
      const u = (i / SEG_U - 0.5) * LEN;
      const [yc, zc] = centerline(u, t);
      const th = twist(u, t);
      const wy = Math.cos(th), wz = Math.sin(th);      // width axis
      const ty = -Math.sin(th), tz = Math.cos(th);     // thickness axis
      const corners = [
        [ HALF_W,  HALF_T], [ HALF_W, -HALF_T],
        [-HALF_W, -HALF_T], [-HALF_W,  HALF_T],
      ];
      for (let k = 0; k < 4; k++) {
        const [w, h] = corners[k];
        pos.setXYZ(i * 4 + k, u, yc + w * wy + h * ty, zc + w * wz + h * tz);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  function applyTune() {
    group.rotation.z = -tune.roll;
    group.position.set(-tune.ox * 0.4, -(tune.oy - 5) * 0.4, 0);
    camera.zoom = tune.zoom / 0.6;
    camera.updateProjectionMatrix();
  }
  applyTune();

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let clockT = 8;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.06);
    last = now;
    if (!reduced.matches) clockT += dt * tune.speed;
    pose.yaw += (target.yaw - pose.yaw) * 0.06;
    pose.pitch += (target.pitch - pose.pitch) * 0.06;
    group.rotation.y = pose.yaw;
    group.rotation.x = pose.pitch;
    updateRibbon(clockT);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  let raf = requestAnimationFrame(frame);

  const api = {
    renderer: {
      state: { playing: true },
      setMaterial(k, v) {
        if (k === 'speed') tune.speed = v;
        else if (k === 'opacity') { faceMat.opacity = v * 0.4; edgeMat.opacity = Math.min(1, v * 1.8); }
        else if (k === 'roll' || k === 'ox' || k === 'oy') { tune[k] = v; applyTune(); }
      },
      setZoomTarget(v) { tune.zoom = v; applyTune(); },
      invalidate() {},
      dispose() { cancelAnimationFrame(raf); renderer.dispose(); },
    },
    parallax: 1,
  };
  window.__dvRibbon = api;
  window.addEventListener('mousemove', e => {
    if (reduced.matches) return;
    const nx = (e.clientX / innerWidth) * 2 - 1;
    const ny = (e.clientY / innerHeight) * 2 - 1;
    target.yaw = nx * 0.066 * api.parallax;
    target.pitch = ny * 0.048 * api.parallax;
  }, { passive: true });
  window.addEventListener('pagehide', () => api.renderer.dispose(), { once: true });
  return api.renderer;
}
