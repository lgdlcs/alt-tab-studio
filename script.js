// ===== LANGUAGE TOGGLE =====
const LANG_KEY = 'alt-tab-lang';
let currentLang = localStorage.getItem(LANG_KEY) || 'fr';

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-fr][data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`);
    });
    // Update meta description
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
        meta.content = lang === 'fr'
            ? 'Alt Tab Studio — Studio digital en Haute-Savoie. On crée votre site web, on vous le montre, vous décidez. Zéro risque.'
            : 'Alt Tab Studio — Digital studio in Haute-Savoie. We build your website, show you, you decide. Zero risk.';
    }
}

document.getElementById('lang-toggle').addEventListener('click', () => {
    setLang(currentLang === 'fr' ? 'en' : 'fr');
});

// Apply saved language on load
setLang(currentLang);

// ===== MOBILE MENU =====
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', navMenu.classList.contains('open'));
});

// Close menu on link click
navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
    });
});

// ===== INTERSECTION OBSERVER (FADE IN) =====
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ===== NAVBAR SHADOW ON SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,0.06)' : 'none';
}, { passive: true });