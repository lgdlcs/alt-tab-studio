// ============ THEME: DAY / NIGHT ============
(function() {
  var hour = new Date().getHours();
  // Night: 20h → 7h
  var isNight = hour >= 20 || hour < 7;
  if (isNight) {
    document.documentElement.setAttribute('data-theme', 'night');
  }
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
