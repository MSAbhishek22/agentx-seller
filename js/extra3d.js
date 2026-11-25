// Extra 3D scenes — added 25 Nov 2026.
// Five new real-Three.js scenes on top of the existing hero balance scale.
// All render on first load with no interaction, all pause off-screen, all
// render one static frame under prefers-reduced-motion.
// Patterns grounded in design references inspected 25 Nov 2026:
//  - threeui.com — 3D cylinder carousel (arrows, drag, keyboard nav);
//    glass cards + iridescent helix; star field + parallax ridgelines;
//    amber-lit network, reflective materials, drag/keyboard rotation.
//  - gsap.com — ScrollTrigger: "turn scrolling into silky-smooth
//    storytelling"; Draggable / SplitText showcase.
//  - skiper-ui.com — kinetic staggered letter animation ("un-common
//    components"); 106+ uncommon components.
//  - 21st.dev — animated hero, shimmer button, number ticker.
//  - godly.website — curation of 3D-heavy award sites (wireframe terrain,
//    fog and light, extruded type).
// Every product shown is real data from store.csv via ./store.js; no
// invented products, prices or figures anywhere in these scenes.
import * as THREE from 'three';
import { STORE, POLICY } from './store.js';
import { floorPrice } from './demo.js';

const CATEGORY_COLOURS = {
  accessories: 0xf5a524,
  apparel: 0x2e9e8f,
  bags: 0xa5673a,
  electronics: 0x4a7fd4,
  footwear: 0xd4544a,
  watches: 0xd4af37,
};
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const IN_STOCK = STORE.filter((r) => r.stock > 0);
const CATEGORIES = ['accessories', 'apparel', 'bags', 'electronics', 'footwear', 'watches'];

function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  return renderer;
}

// Runs one scene: resize handling, pause when off-screen, one static frame
// under reduced motion. build(scene, camera) returns { tick(t) }.
function runScene(canvas, build) {
  const wrap = canvas.parentElement;
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  const api = build(scene, camera) || {};
  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (w === 0 || h === 0) return;
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
  if (REDUCED) {
    if (api.tick) api.tick(1.2);
    renderer.render(scene, camera);
    return;
  }
  let raf = 0;
  (function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    if (api.tick) api.tick(clock.getElapsedTime());
    renderer.render(scene, camera);
  })();
  return { destroy() { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', resize); } };
}

function makeCrate(size, colour) {
  const geo = new THREE.BoxGeometry(size, size, size);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7, metalness: 0.1 })
  );
  mesh.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x101418 })
  ));
  return mesh;
}

function makeCoin(r, mat) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 24), mat);
}

const GOLD = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.25, metalness: 0.9 });

// One in-stock product per category, then the next in-stock products by SKU.
function shelfPicks(n) {
  const picks = [];
  for (const c of CATEGORIES) {
    const p = IN_STOCK.find((r) => r.category === c);
    if (p) picks.push(p);
  }
  for (const r of IN_STOCK) {
    if (picks.length >= n) break;
    if (!picks.includes(r)) picks.push(r);
  }
  return picks.slice(0, n);
}

/* ------------------------------------------------------------------ */
/* 1. Market shelf — full-width band at the bottom of the hero.        */
/*    A rotating ring of 8 real products + floating gold coins, fog.   */
/*    Visible on first load. Pattern: threeui 3D cylinder carousel +   */
/*    layered product composition.                                     */
/* ------------------------------------------------------------------ */
function initShelf() {
  const canvas = document.getElementById('shelf-canvas');
  if (!canvas) return;
  const picks = shelfPicks(8);
  runScene(canvas, (scene, camera) => {
    scene.fog = new THREE.Fog(0x101418, 9, 18);
    scene.add(new THREE.AmbientLight(0x8fa3bf, 0.6));
    const lamp = new THREE.PointLight(0xffb347, 40, 24, 1.8);
    lamp.position.set(0, 5, 4);
    scene.add(lamp);
    camera.position.set(0, 2.3, 7.2);

    const ring = new THREE.Group();
    scene.add(ring);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(5.0, 48),
      new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.95, metalness: 0 })
    );
    disc.rotation.x = -Math.PI / 2;
    scene.add(disc);

    const coins = [];
    picks.forEach((p, i) => {
      const a = (i / picks.length) * Math.PI * 2;
      const crate = makeCrate(1.0, CATEGORY_COLOURS[p.category]);
      crate.position.set(Math.cos(a) * 4.0, 0.6, Math.sin(a) * 4.0);
      crate.rotation.y = -a;
      ring.add(crate);
      const coin = makeCoin(0.3, GOLD);
      coin.position.set(Math.cos(a + 0.4) * 4.0, 1.85 + (i % 2) * 0.3, Math.sin(a + 0.4) * 4.0);
      coin.userData = { baseY: coin.position.y, phase: i * 1.1 };
      ring.add(coin);
      coins.push(coin);
    });

    let mx = 0, targetCamX = 0;
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 2 - 1;
    });
    return {
      tick(t) {
        ring.rotation.y += 0.0022;
        for (const c of coins) {
          c.position.y = c.userData.baseY + Math.sin(t * 0.9 + c.userData.phase) * 0.18;
          c.rotation.y += 0.02;
        }
        targetCamX += (mx * 1.2 - targetCamX) * 0.04;
        camera.position.x = targetCamX;
        camera.lookAt(0, 1.1, 0);
      },
    };
  });
}

/* ------------------------------------------------------------------ */
/* 2. Policy gate — small scene inside the hero copy. A gold coin      */
/*    slides through a glowing amber gate and turns green once it      */
/*    passes: the policy layer, as a living picture. Visible on        */
/*    first load. Pattern: threeui glass / holographic UI.             */
/* ------------------------------------------------------------------ */
function initGate() {
  const canvas = document.getElementById('gate-canvas');
  if (!canvas) return;
  runScene(canvas, (scene, camera) => {
    scene.add(new THREE.AmbientLight(0x8fa3bf, 0.95));
    const lamp = new THREE.PointLight(0xffb347, 60, 16, 1.8);
    lamp.position.set(0, 4, 3);
    scene.add(lamp);
    // Warm front fill so the coin and the frame read against the dark ground.
    const fill = new THREE.PointLight(0xffc46b, 18, 10, 1.8);
    fill.position.set(0, 1.2, 3.2);
    scene.add(fill);
    camera.position.set(0, 1.45, 3.9);
    camera.lookAt(0, 1.2, 0);

    const glass = new THREE.MeshStandardMaterial({
      color: 0xf5a524, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.5,
      emissive: 0xf5a524, emissiveIntensity: 0.9,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a4552, roughness: 0.5, metalness: 0.7 });
    for (const x of [-1.4, 1.4]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 0.28), glass);
      pillar.position.set(x, 1.3, 0);
      scene.add(pillar);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), dark);
      base.position.set(x, 0.09, 0);
      scene.add(base);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.24, 0.28), glass);
    lintel.position.set(0, 2.7, 0);
    scene.add(lintel);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 40),
      new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    // Glowing threshold line across the gate — the line every price must cross.
    const threshold = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 0.05, 0.34),
      new THREE.MeshBasicMaterial({ color: 0xf5a524 })
    );
    threshold.position.set(0, 0.03, 0);
    scene.add(threshold);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf2c14e, roughness: 0.25, metalness: 0.9,
      emissive: 0x8a6d1f, emissiveIntensity: 0.7,
    });
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x2e9e8f, roughness: 0.3, metalness: 0.6,
      emissive: 0x1f7a4d, emissiveIntensity: 1.0,
    });
    const coin = makeCoin(0.68, goldMat);
    coin.rotation.x = Math.PI / 2.4;
    scene.add(coin);
    return {
      tick(t) {
        const cyc = (t % 5) / 5; // 5-second loop
        // Travel stays between the gate posts (±1.4), so the coin is
        // mid-gate in any still screenshot — never parked at an edge.
        coin.position.set(-1.15 + cyc * 2.3, 1.2, 0);
        // Spin around the coin's own face normal (local Y): with the
        // fixed x-tilt the face stays toward the camera, so the coin
        // reads as a round coin in every frame instead of tumbling
        // edge-on (rotation.z would swing the face away twice a spin).
        coin.rotation.y += 0.03;
        coin.material = coin.position.x > 0 ? greenMat : goldMat;
      },
    };
  });
}

/* ------------------------------------------------------------------ */
/* 3. Product carousel — demo section. Ten real in-stock products on  */
/*    a 3D ring. Arrows, drag, keyboard and click-to-select; the       */
/*    "Use this product" button loads the front product into the live  */
/*    negotiation demo. Pattern: threeui Volta Atelier 3D cylinder     */
/*    carousel (arrows, dragging, keyboard navigation).                */
/* ------------------------------------------------------------------ */
function initCarousel() {
  const canvas = document.getElementById('carousel-canvas');
  if (!canvas) return;
  const label = document.getElementById('carousel-label');
  const note = document.getElementById('carousel-note');
  const useBtn = document.getElementById('carousel-use-btn');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const select = document.getElementById('product-select');
  const picks = shelfPicks(10);

  runScene(canvas, (scene, camera) => {
    scene.fog = new THREE.Fog(0x171d24, 9, 18);
    scene.add(new THREE.AmbientLight(0x8fa3bf, 0.6));
    const lamp = new THREE.PointLight(0xffb347, 50, 26, 1.8);
    lamp.position.set(0, 6, 5);
    scene.add(lamp);
    camera.position.set(0, 3.0, 8.6);
    camera.lookAt(0, 0.9, 0);

    const ring = new THREE.Group();
    scene.add(ring);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(5.2, 48),
      new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.95, metalness: 0 })
    );
    disc.rotation.x = -Math.PI / 2;
    scene.add(disc);
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.03, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xf5a524 })
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.set(0, 0.02, 3.6);
    scene.add(glow);

    const meshes = picks.map((p, i) => {
      const a = (i / picks.length) * Math.PI * 2;
      const crate = makeCrate(0.95, CATEGORY_COLOURS[p.category]);
      crate.position.set(Math.sin(a) * 3.6, 0.6, Math.cos(a) * 3.6);
      crate.rotation.y = a;
      crate.userData = { sku: p.sku, index: i, baseY: 0.6 };
      ring.add(crate);
      return crate;
    });

    const TWO_PI = Math.PI * 2;
    let selected = 0;
    let targetAngle = 0;
    let autoRotate = true;
    let lastAdvance = 0;

    function nearestTarget(current, target) {
      return current + ((((target - current) % TWO_PI) + TWO_PI * 1.5) % TWO_PI) - Math.PI;
    }
    function updateLabel() {
      const p = picks[selected];
      label.innerHTML = `<strong>${p.name}</strong> — list ${fmt(p.price)} · policy floor ${fmt(floorPrice(p))} · stock ${p.stock} · ${p.category}`;
    }
    function highlight() {
      meshes.forEach((m, i) => {
        const front = i === selected;
        m.scale.setScalar(front ? 1.18 : 1);
        m.position.y = m.userData.baseY + (front ? 0.25 : 0);
      });
    }
    function selectIndex(i) {
      selected = (i + picks.length) % picks.length;
      targetAngle = nearestTarget(ring.rotation.y, -(selected / picks.length) * TWO_PI);
      updateLabel();
      highlight();
    }
    function stopAuto() { autoRotate = false; }
    updateLabel();
    highlight();

    // --- controls: buttons, keyboard, drag, click-to-select
    prevBtn.addEventListener('click', () => { stopAuto(); selectIndex(selected - 1); });
    nextBtn.addEventListener('click', () => { stopAuto(); selectIndex(selected + 1); });
    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { stopAuto(); selectIndex(selected - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { stopAuto(); selectIndex(selected + 1); e.preventDefault(); }
    });
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false, moved = 0, lastX = 0, dragAngle = 0;
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true; moved = 0; lastX = e.clientX; dragAngle = ring.rotation.y;
      stopAuto(); canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      moved += Math.abs(dx);
      lastX = e.clientX;
      ring.rotation.y = dragAngle + dx * 0.004 + (ring.rotation.y - dragAngle);
      // drag rotates freely; snap on release
      targetAngle = ring.rotation.y;
    });
    canvas.addEventListener('pointerup', (e) => {
      dragging = false;
      if (moved < 6) {
        const r = canvas.getBoundingClientRect();
        pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length) selectIndex(hits[0].object.userData.index);
      } else {
        // snap to the nearest crate
        const frac = ((-ring.rotation.y / TWO_PI) * picks.length) % picks.length;
        const nearest = Math.round(frac < 0 ? frac + picks.length : frac) % picks.length;
        selectIndex(nearest);
      }
    });
    canvas.addEventListener('pointercancel', () => { dragging = false; });

    useBtn.addEventListener('click', () => {
      if (select.disabled) {
        note.textContent = 'A talk is running — finish it or press Reset first, then load a product.';
        return;
      }
      note.textContent = '';
      select.value = picks[selected].sku;
      select.dispatchEvent(new Event('change'));
      const prev = useBtn.textContent;
      useBtn.textContent = 'Loaded into the demo ✓';
      setTimeout(() => { useBtn.textContent = prev; }, 2000);
    });

    return {
      tick(t) {
        if (autoRotate && t - lastAdvance > 3.2) { lastAdvance = t; selectIndex(selected + 1); }
        if (!dragging) ring.rotation.y += (targetAngle - ring.rotation.y) * 0.06;
      },
    };
  });
}

/* ------------------------------------------------------------------ */
/* 4. Two-layer stack — design section. A glass policy slab floats     */
/*    above a brass strategy slab; scrolling turns the stack and       */
/*    pulls the layers apart. Pattern: gsap.com ScrollTrigger          */
/*    storytelling + threeui "four interactive architecture layers".   */
/* ------------------------------------------------------------------ */
function initLayers() {
  const canvas = document.getElementById('layers-canvas');
  if (!canvas) return;
  const section = document.getElementById('design');
  runScene(canvas, (scene, camera) => {
    scene.add(new THREE.AmbientLight(0x8fa3bf, 0.6));
    const lamp = new THREE.PointLight(0xffb347, 50, 26, 1.8);
    lamp.position.set(3, 5, 4);
    scene.add(lamp);
    camera.position.set(0, 2.6, 7.5);

    const rig = new THREE.Group();
    scene.add(rig);
    const glass = new THREE.MeshStandardMaterial({
      color: 0xf5a524, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.45,
    });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9962e, roughness: 0.35, metalness: 0.8 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.28, 2.4), glass);
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.28, 2.4), brass);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.6, 12),
      new THREE.MeshBasicMaterial({ color: 0xf5a524 })
    );
    rig.add(top, bottom, beam);
    const cubes = [];
    for (let i = 0; i < 6; i++) {
      const c = makeCrate(0.3, [0x2e9e8f, 0x4a7fd4, 0xd4544a][i % 3]);
      const a = (i / 6) * Math.PI * 2;
      c.position.set(Math.cos(a) * 2.8, (i % 2 ? 0.7 : -0.7), Math.sin(a) * 2.8);
      c.userData = { angle: a, y: c.position.y };
      rig.add(c);
      cubes.push(c);
    }

    let progress = 0.35;
    function onScroll() {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      progress = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return {
      tick(t) {
        rig.rotation.y = progress * Math.PI * 2 + Math.sin(t * 0.3) * 0.08;
        const sep = 0.85 + progress * 0.55;
        top.position.y = sep / 2;
        bottom.position.y = -sep / 2;
        beam.scale.y = sep / 1.6;
        for (const c of cubes) {
          c.rotation.y += 0.01;
          c.position.y = c.userData.y + Math.sin(t * 0.8 + c.userData.angle) * 0.15;
        }
        camera.position.x = Math.sin(t * 0.1) * 0.4;
        camera.lookAt(0, 0, 0);
      },
    };
  });
}

/* ------------------------------------------------------------------ */
/* 5. Wireframe terrain — pack section. A wireframe night terrain     */
/*    with a drifting amber starfield, slow camera drift. Pattern:     */
/*    godly.website wireframe-terrain heroes + threeui star field.     */
/* ------------------------------------------------------------------ */
function initTerrain() {
  const canvas = document.getElementById('terrain-canvas');
  if (!canvas) return;
  runScene(canvas, (scene, camera) => {
    scene.fog = new THREE.Fog(0x101418, 8, 22);
    scene.add(new THREE.AmbientLight(0x8fa3bf, 0.7));
    const geo = new THREE.PlaneGeometry(26, 16, 40, 24);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.35) * 0.9 + Math.cos(y * 0.5) * 0.7 + Math.sin((x + y) * 0.22) * 0.5);
    }
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: 0x2e9e8f, wireframe: true, transparent: true, opacity: 0.5 })
    );
    terrain.rotation.x = -Math.PI / 2.3;
    terrain.position.y = -1.2;
    scene.add(terrain);

    const starGeo = new THREE.BufferGeometry();
    const pts = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      pts[i * 3] = (Math.random() - 0.5) * 24;
      pts[i * 3 + 1] = Math.random() * 6 + 0.5;
      pts[i * 3 + 2] = (Math.random() - 0.5) * 10 - 4;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xf5a524, size: 0.07, transparent: true, opacity: 0.85 })
    );
    scene.add(stars);
    camera.position.set(0, 2.4, 9);
    return {
      tick(t) {
        camera.position.x = Math.sin(t * 0.08) * 2.2;
        camera.lookAt(0, 0.4, 0);
        stars.rotation.y = t * 0.01;
      },
    };
  });
}

export function initExtra3D() {
  initShelf();
  initGate();
  initCarousel();
  initLayers();
  initTerrain();
}
