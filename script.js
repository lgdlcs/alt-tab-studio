// ============ THEME: DAY / NIGHT ============
(function() {
  // URL override: ?theme=day or ?theme=night
  var params = new URLSearchParams(window.location.search);
  var forced = params.get('theme');
  if (forced === 'night') {
    document.documentElement.setAttribute('data-theme', 'night');
    return;
  }
  if (forced === 'day') {
    document.documentElement.removeAttribute('data-theme');
    return;
  }
  // Auto: night 20h → 7h
  var hour = new Date().getHours();
  if (hour >= 20 || hour < 7) {
    document.documentElement.setAttribute('data-theme', 'night');
  }
})();

// ============ HERO SCROLL REVEAL ============
(function() {
  var el = document.getElementById('hero-reveal');
  if (!el) return;

  // Split text into individual chars, preserving <strong> tags
  var html = el.innerHTML;
  var result = '';
  var inTag = false;
  var tagBuffer = '';

  for (var i = 0; i < html.length; i++) {
    var c = html[i];
    if (c === '<') {
      inTag = true;
      tagBuffer = '<';
      continue;
    }
    if (inTag) {
      tagBuffer += c;
      if (c === '>') {
        inTag = false;
        result += tagBuffer;
        tagBuffer = '';
      }
      continue;
    }
    if (c === ' ') {
      result += ' ';
    } else {
      result += '<span class="char">' + c + '</span>';
    }
  }

  el.innerHTML = result;

  var chars = el.querySelectorAll('.char');
  var total = chars.length;
  var litIndex = 0;
  var animDone = false;

  // Auto-animate on load — reveal chars progressively
  function autoReveal() {
    if (litIndex >= total) { animDone = true; return; }
    chars[litIndex].classList.add('lit');
    litIndex++;
    // Speed: ~30ms per char (fast but readable)
    setTimeout(autoReveal, 30);
  }

  // Start after a brief delay
  setTimeout(autoReveal, 600);

  // Scroll can also accelerate the reveal
  function onScroll() {
    if (animDone) return;
    var scrollY = window.scrollY || window.pageYOffset;
    var heroH = document.getElementById('hero').offsetHeight;
    var progress = Math.min(1, Math.max(0, scrollY / (heroH * 0.4)));
    var targetLit = Math.floor(progress * total);
    // Jump ahead if scroll is faster than animation
    while (litIndex < targetLit && litIndex < total) {
      chars[litIndex].classList.add('lit');
      litIndex++;
    }
    if (litIndex >= total) animDone = true;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();

// ============ NAV TOGGLE ============
var toggle = document.getElementById('nav-toggle');
var links = document.getElementById('nav-links');
toggle.addEventListener('click', function() {
  links.classList.toggle('open');
});
links.querySelectorAll('a').forEach(function(a) {
  a.addEventListener('click', function() {
    links.classList.remove('open');
  });
});

// ============ NAV SCROLL ============
var nav = document.getElementById('nav');
window.addEventListener('scroll', function() {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});
