// ============ NAV ============
var nav = document.getElementById('nav');
var toggle = document.getElementById('nav-toggle');
var links = document.getElementById('nav-links');

toggle.addEventListener('click', function () { links.classList.toggle('open'); });
links.querySelectorAll('a').forEach(function (a) {
  a.addEventListener('click', function () { links.classList.remove('open'); });
});
var progress = document.getElementById('progress');
window.addEventListener('scroll', function () {
  nav.classList.toggle('scrolled', window.scrollY > 24);
  if (progress) {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }
}, { passive: true });

// ============ APP SWITCHER (signature) ============
(function () {
  var switcher = document.getElementById('switcher');
  var labelEl = document.getElementById('switch-label');
  if (!switcher) return;

  var tiles = Array.prototype.slice.call(switcher.querySelectorAll('.tile'));
  var i = 0;
  var auto = true;

  function decode(s) { var t = document.createElement('textarea'); t.innerHTML = s; return t.value; }

  function activate(idx) {
    tiles.forEach(function (t) { t.classList.remove('is-active'); });
    var tile = tiles[idx];
    tile.classList.add('is-active');
    labelEl.style.opacity = '0';
    setTimeout(function () {
      labelEl.textContent = decode(tile.getAttribute('data-label'));
      labelEl.style.opacity = '1';
    }, 300);
  }

  function step() {
    if (!auto) return;
    i = (i + 1) % tiles.length;
    activate(i);
  }

  var timer = setInterval(step, 2800);

  // hover / focus to inspect a specific tool, pausing the cycle
  tiles.forEach(function (tile, idx) {
    function pick() { auto = false; i = idx; activate(idx); }
    tile.addEventListener('mouseenter', pick);
    tile.addEventListener('focus', pick);
    tile.addEventListener('click', pick);
  });
  switcher.addEventListener('mouseleave', function () { auto = true; });

  // pause cycling when hero is off-screen (perf)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { if (!timer) timer = setInterval(step, 2800); }
        else { clearInterval(timer); timer = null; }
      });
    }, { threshold: 0 }).observe(switcher);
  }
})();

// ============ SCROLL REVEAL ============
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  els.forEach(function (el, n) {
    el.style.transitionDelay = (Math.min(n % 4, 3) * 80) + 'ms';
    io.observe(el);
  });
})();

// ============ CONTACT FORM ============
(function () {
  var form = document.getElementById('contact-form');
  var success = document.getElementById('form-success');
  var btn = document.getElementById('submit-btn');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    btn.textContent = 'Envoi…';
    btn.disabled = true;

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(reveal).catch(reveal);

    function reveal() {
      form.style.display = 'none';
      success.classList.add('show');
    }
  });
})();
