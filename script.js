/* ========== LANGUAGE TOGGLE ========== */
const langToggle = document.getElementById('langToggle');
let currentLang = localStorage.getItem('lang') || 'fr';

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  langToggle.textContent = lang === 'fr' ? 'EN' : 'FR';

  document.querySelectorAll('[data-fr]').forEach(el => {
    el.textContent = el.getAttribute(`data-${lang}`);
  });

  document.querySelectorAll('[data-fr-placeholder]').forEach(el => {
    el.placeholder = el.getAttribute(`data-${lang}-placeholder`);
  });
}

langToggle.addEventListener('click', () => {
  setLang(currentLang === 'fr' ? 'en' : 'fr');
});

setLang(currentLang);

/* ========== NAVBAR SCROLL ========== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ========== REVEAL ON SCROLL ========== */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => observer.observe(el));

/* ========== HORIZONTAL CAROUSEL DRAG ========== */
const carousel = document.querySelector('.projects-scroll');
if (carousel) {
  let isDown = false, startX, scrollLeft;

  carousel.addEventListener('mousedown', e => {
    isDown = true;
    carousel.style.cursor = 'grabbing';
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });

  carousel.addEventListener('mouseleave', () => { isDown = false; carousel.style.cursor = 'grab'; });
  carousel.addEventListener('mouseup', () => { isDown = false; carousel.style.cursor = 'grab'; });

  carousel.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    carousel.scrollLeft = scrollLeft - (x - startX);
  });
}

/* ========== SMOOTH ANCHOR SCROLL ========== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
