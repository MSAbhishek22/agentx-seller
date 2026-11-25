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
    // Size the drawing buffer from the CANVAS's own CSS box, not the wrap:
    // the wrap also holds the caption, so sizing from it squashed every
    // scene vertically (~19%) — round coins rendered as ovals, and the
    // shelf's front crates were pushed toward the bottom edge. This was
    // one of the two root causes behind the round-1 real-browser failures.
    const w = canvas.clientWidth, h = canvas.clientHeight;
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

// Bright coin materials. The old gold used metalness 0.9 with no
// environment map on the page, so it rendered near-black (dark bronze)
// and only its specular highlight ever showed. Low metalness + strong
// emissive means the face reads bright gold in any frame, any angle.
const GOLD_DISC = new THREE.MeshStandardMaterial({
  color: 0xffd24a, roughness: 0.3, metalness: 0.25,
  emissive: 0xcc8a00, emissiveIntensity: 1.5, side: THREE.DoubleSide,
});
const GOLD_RIM = new THREE.MeshStandardMaterial({
  color: 0xffc233, roughness: 0.3, metalness: 0.4,
  emissive: 0xb97e00, emissiveIntensity: 1.3,
});

// A coin that always faces the camera: a flat disc + torus rim in the XY
// plane (facing +Z), billboarded with lookAt() every frame. The round-1
// coin was a cylinder tilted rotation.x = π/2.4 and spun on rotation.y;
// the tilt made its face an ellipse, the vertical buffer squash (see
// runScene) flattened it further, and the dark metal finished the job —
// in the real browser it read as a thin bronze sliver. A billboarded
// disc cannot turn edge-on, in any frame, at any spin.
function makeBillboardCoin(r, discMat, rimMat) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 48), discMat);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.07, 12, 48), rimMat);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, r * 0.04, 8, 48), rimMat);
  inner.position.z = 0.01;
  g.add(disc, rim, inner);
  return g;
}

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
    scene.fog = new THREE.Fog(0x101418, 12, 26);
    scene.add(new THREE.AmbientLight(0x8fa3bf, 0.8));
    const lamp = new THREE.PointLight(0xffb347, 60, 26, 1.8);
    lamp.position.set(0, 5, 4);
    scene.add(lamp);
    // Reframed (round 2): the old camera (0, 2.3, 7.2) put the front
    // crates' bases ~34.5° below horizontal against a frame bottom of
    // ~32°, so their bases — and the near half of the disc — were sliced
    // off. Camera pulled back and raised, FOV narrowed to 36°, ring
    // radius 4.0 → 2.9, disc 5.0 → 3.5. At the new framing the front
    // disc edge sits ~26° below horizontal against a ~32° frame bottom,
    // and the highest coin top ~5° below against a ~4° frame top: the
    // full ring, the full disc and the full coins fit with clear margin.
    camera.position.set(0, 3.6, 10.8);
    camera.fov = 36;
    camera.updateProjectionMatrix();

    const ring = new THREE.Group();
    scene.add(ring);
    // Elliptical disc: the band is ~12× wider than tall, so a round ring
    // read as a small cluster lost in dark space. The ellipse (x 8.0,
    // z 2.9) fills the band's width while its z-depth — which is what
    // sets the vertical fit — is unchanged from the round-2 reframe.
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.9, 48),
      new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.95, metalness: 0 })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.scale.set(8.0 / 2.9, 1, 1);
    scene.add(disc);

    // Coins live at scene level (not ring children) and are billboarded
    // every frame: the old flat cylinders lay horizontal and were seen
    // nearly edge-on from this camera, so they read as thin slivers.
    const coins = [];
    picks.forEach((p, i) => {
      const a = (i / picks.length) * Math.PI * 2;
      const crate = makeCrate(1.15, CATEGORY_COLOURS[p.category]);
      crate.position.set(Math.cos(a) * 8.0, 0.6, Math.sin(a) * 2.9);
      crate.rotation.y = -a;
      ring.add(crate);
      const coin = makeBillboardCoin(0.36, GOLD_DISC, GOLD_RIM);
      coin.userData = { angle: a + 0.4, baseY: 1.9 + (i % 2) * 0.3, phase: i * 1.1 };
      scene.add(coin);
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
          const a = c.userData.angle + ring.rotation.y;
          c.position.set(
            Math.cos(a) * 8.0,
            c.userData.baseY + Math.sin(t * 0.9 + c.userData.phase) * 0.18,
            Math.sin(a) * 2.9
          );
          c.lookAt(camera.position);
        }
        targetCamX += (mx * 1.2 - targetCamX) * 0.04;
        camera.position.x = targetCamX;
        camera.lookAt(0, 0.85, 0);
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
    // Warm front fill, from the viewer's side and in front of the coin's
    // plane, so the coin's face and the posts are lit toward the camera.
    const fill = new THREE.PointLight(0xffc46b, 30, 12, 1.8);
    fill.position.set(0, 1.4, 2.6);
    scene.add(fill);
    // Small lamp right in front of the coin so its face can never go dark.
    const coinLamp = new THREE.PointLight(0xffe08a, 15, 6, 1.8);
    coinLamp.position.set(0, 1.35, 1.8);
    scene.add(coinLamp);
    camera.position.set(0, 1.45, 3.9);
    camera.lookAt(0, 1.3, 0);

    // Frame: the old posts were 0.28 wide in a canvas ~6.7× wider than
    // tall, so the whole gate filled ~15% of the frame and read small;
    // their emissive 0.9 halved again by 0.5 opacity read dull brown.
    // The gate is now wider (±2.4), the posts thicker (0.34) with a
    // stronger emissive (1.6 at 0.7 opacity), and each post — and the
    // lintel — carries an unlit amber core that glows in every frame
    // regardless of the lighting angle.
    const glass = new THREE.MeshStandardMaterial({
      color: 0xf5a524, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.7,
      emissive: 0xf5a524, emissiveIntensity: 1.6,
    });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffc233 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a4552, roughness: 0.5, metalness: 0.7 });
    for (const x of [-2.4, 2.4]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.6, 0.34), glass);
      pillar.position.set(x, 1.3, 0);
      scene.add(pillar);
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.12), coreMat);
      core.position.set(x, 1.3, 0);
      scene.add(core);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.56), dark);
      base.position.set(x, 0.09, 0);
      scene.add(base);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.26, 0.3), glass);
    lintel.position.set(0, 2.7, 0);
    scene.add(lintel);
    const lintelCore = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.07, 0.32), coreMat);
    lintelCore.position.set(0, 2.58, 0);
    scene.add(lintelCore);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3.6, 40),
      new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    // Glowing threshold line across the gate — the line every price must cross.
    const threshold = new THREE.Mesh(
      new THREE.BoxGeometry(5.1, 0.05, 0.34),
      new THREE.MeshBasicMaterial({ color: 0xf5a524 })
    );
    threshold.position.set(0, 0.03, 0);
    scene.add(threshold);
    // Amber floor strip: the canvas is far wider than the gate is tall,
    // so a lit strip grounds the composition instead of dark empty space.
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(9.5, 0.04, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x8a5a10 })
    );
    strip.position.set(0, 0.02, 0.85);
    scene.add(strip);

    // The coin: a flat disc + torus rim facing +Z, billboarded at the
    // camera every frame, parked at the centre of the gate (x = 0, y =
    // 1.35 — the gate's middle). It can never turn edge-on and it can
    // never drift off-centre in a still frame, which is what the round-1
    // coin did (it travelled ±1.15, so most stills caught it off-centre).
    // The coin itself stays bright gold in every frame; the "passed"
    // state is a green halo that fades in around it — so a still taken
    // at any moment reads ROUND and BRIGHT GOLD.
    const coin = makeBillboardCoin(0.95, GOLD_DISC, GOLD_RIM);
    coin.position.set(0, 1.35, 0);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.05, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0x2e9e8f, transparent: true, opacity: 0 })
    );
    coin.add(halo);
    scene.add(coin);
    // Two small companion coins fill the wide canvas either side.
    const minis = [];
    for (const x of [-3.6, 3.6]) {
      const mini = makeBillboardCoin(0.42, GOLD_DISC, GOLD_RIM);
      mini.position.set(x, 1.35, 0);
      scene.add(mini);
      minis.push(mini);
    }
    let wasGreen = false;
    return {
      tick(t) {
        coin.position.y = 1.35 + Math.sin(t * 1.2) * 0.05;
        coin.lookAt(camera.position);
        for (const m of minis) m.lookAt(camera.position);
        // Gold while it waits at the gate; once it has "passed", a green
        // halo fades in around the still-gold coin.
        const green = (t % 5) >= 2.5;
        if (green !== wasGreen) {
          wasGreen = green;
          halo.material.opacity = green ? 0.9 : 0;
        }
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
