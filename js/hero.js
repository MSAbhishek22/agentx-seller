// Hero scene: a night-market balance scale — list price on one pan, the policy
// floor on the other — ringed by drifting product crates in category colours.
// Real Three.js r160, vendored locally. Single canvas, pauses off-screen,
// prefers-reduced-motion renders one still frame. Auto-rotate stops on interaction.
import * as THREE from 'three';

const CATEGORY_COLOURS = {
  accessories: 0xf5a524,
  apparel: 0x2e9e8f,
  bags: 0xa5673a,
  electronics: 0x4a7fd4,
  footwear: 0xd4544a,
  watches: 0xd4af37,
};

export function initHero() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return null;
  const wrap = canvas.parentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 2.4, 10.5);

  // ---- lights: warm stall lamp + cool night fill
  scene.add(new THREE.AmbientLight(0x8fa3bf, 0.55));
  const lamp = new THREE.PointLight(0xffb347, 60, 30, 1.8);
  lamp.position.set(3.5, 6, 4);
  scene.add(lamp);
  const fill = new THREE.DirectionalLight(0x7fb2ff, 0.5);
  fill.position.set(-5, 4, -3);
  scene.add(fill);

  const rig = new THREE.Group();
  scene.add(rig);

  // ---- ground: dark disc + amber rings
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(6.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.95, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  rig.add(ground);
  for (const [r, tube] of [[3.4, 0.02], [5.0, 0.015]]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, tube, 8, 80),
      new THREE.MeshBasicMaterial({ color: 0xf5a524, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    rig.add(ring);
  }

  // ---- balance scale
  const scale = new THREE.Group();
  scale.position.y = 0;
  rig.add(scale);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9962e, roughness: 0.35, metalness: 0.8 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x3a4552, roughness: 0.5, metalness: 0.7 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.18, 32), darkMetal);
  base.position.y = 0.09;
  scale.add(base);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.6, 16), brass);
  pillar.position.y = 1.48;
  scale.add(pillar);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), brass);
  finial.position.y = 2.86;
  scale.add(finial);

  const beam = new THREE.Group();
  beam.position.y = 2.62;
  scale.add(beam);
  const beamBar = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 0.1), brass);
  beam.add(beamBar);
  // pan hangers + pans
  function makePan(side) {
    const pan = new THREE.Group();
    pan.position.set(side * 2.15, -0.55, 0);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 0.1, 24), brass);
    pan.add(dish);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 8, 32), darkMetal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.05;
    pan.add(rim);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 6), darkMetal);
      rod.position.set(Math.cos(a) * 0.3, 0.32, Math.sin(a) * 0.3);
      rod.rotation.z = Math.cos(a) * 0.5;
      rod.rotation.x = -Math.sin(a) * 0.5;
      pan.add(rod);
    }
    return pan;
  }
  const panL = makePan(-1);
  const panR = makePan(1);
  beam.add(panL, panR);

  // gold coin stacks: list price (taller) vs floor (shorter)
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.25, metalness: 0.9 });
  function coinStack(n, pan) {
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.09, 24), gold);
      c.position.y = 0.1 + i * 0.1;
      pan.add(c);
    }
  }
  coinStack(5, panL); // list price
  coinStack(3, panR); // policy floor

  // ---- drifting product crates, one colour per category
  const crates = [];
  const cats = Object.entries(CATEGORY_COLOURS);
  const boxGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const edgeGeo = new THREE.EdgesGeometry(boxGeo);
  for (let i = 0; i < 12; i++) {
    const [name, colour] = cats[i % cats.length];
    const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7, metalness: 0.1 });
    const crate = new THREE.Mesh(boxGeo, mat);
    const edge = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x101418 }));
    crate.add(edge);
    const angle = (i / 12) * Math.PI * 2 + (i % 2) * 0.35;
    const radius = 3.6 + (i % 3) * 0.9;
    crate.position.set(Math.cos(angle) * radius, 0.9 + (i % 4) * 0.75, Math.sin(angle) * radius);
    crate.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, 0);
    crate.userData = { baseY: crate.position.y, phase: i * 0.7, spin: 0.15 + (i % 3) * 0.08, name };
    rig.add(crate);
    crates.push(crate);
  }

  // ---- interaction: mouse parallax + drag orbit; auto-rotate stops on input
  let targetX = 0, targetY = 0, mouseX = 0, mouseY = 0;
  let autoRotate = true;
  let dragX = 0, dragging = false, lastX = 0;
  const stopSpin = () => { autoRotate = false; };
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; stopSpin(); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouseY = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (dragging) { dragX += (e.clientX - lastX) * 0.004; lastX = e.clientX; }
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', stopSpin, { passive: true });
  canvas.addEventListener('touchstart', stopSpin, { passive: true });

  // ---- sizing + visibility
  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.02 });
  io.observe(wrap);

  const clock = new THREE.Clock();
  function renderFrame(t) {
    // gentle beam sway: the scale tips toward list price, then settles back
    beam.rotation.z = 0.045 + Math.sin(t * 0.6) * 0.05;
    for (const c of crates) {
      c.position.y = c.userData.baseY + Math.sin(t * 0.8 + c.userData.phase) * 0.22;
      c.rotation.y += 0.002 + c.userData.spin * 0.002;
    }
    targetX += (mouseX * 0.9 + dragX - targetX) * 0.05;
    targetY += (mouseY * 0.35 - targetY) * 0.05;
    camera.position.x = targetX;
    camera.position.y = 2.4 - targetY * 0.6;
    camera.lookAt(0, 1.5, 0);
    if (autoRotate) rig.rotation.y += 0.0016;
    renderer.render(scene, camera);
  }

  if (reduced) {
    renderFrame(1.2);
    return { renderer };
  }
  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    renderFrame(clock.getElapsedTime());
  }
  loop();
  return {
    renderer,
    destroy() { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', resize); },
  };
}
