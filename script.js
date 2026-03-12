// ============ THEME: DAY / NIGHT ============
(function() {
  var hour = new Date().getHours();
  // Night: 20h → 7h
  var isNight = hour >= 20 || hour < 7;
  if (isNight) {
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

  function onScroll() {
    var scrollY = window.scrollY || window.pageYOffset;
    var heroH = document.getElementById('hero').offsetHeight;
    // Progress: 0 at top, 1 when scrolled past 60% of hero
    var progress = Math.min(1, Math.max(0, scrollY / (heroH * 0.55)));
    // How many chars to light up
    var litCount = Math.floor(progress * total);

    for (var i = 0; i < total; i++) {
      if (i < litCount) {
        chars[i].classList.add('lit');
      } else {
        chars[i].classList.remove('lit');
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
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
