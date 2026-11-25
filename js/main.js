// Page wiring: scroll reveal, 3D tilt on cards, hero scene, live demo,
// extra 3D scenes (shelf, gate, carousel, layers stack, terrain).
import { initHero } from './hero.js';
import { initDemo } from './demo.js';
import { initExtra3D } from './extra3d.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll reveal: fade + rise (transform + opacity only).
const revealEls = document.querySelectorAll('.reveal');
if (reduced || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.12 });
  revealEls.forEach((el) => io.observe(el));
}

// 3D tilt on the problem/scoring cards, the two layer panels and the
// manipulator quotes (pointer only, transform only).
if (!reduced && window.matchMedia('(pointer: fine)').matches) {
  for (const card of document.querySelectorAll('.card, .pack-item, .layer, .tactic')) {
    card.classList.add('tilt');
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 6;
      const y = ((e.clientY - r.top) / r.height - 0.5) * -6;
      card.style.transform = `perspective(700px) rotateY(${x}deg) rotateX(${y}deg) translateY(-2px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  }
}

initHero();
initDemo();
initExtra3D();
