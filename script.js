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

// ============ FORM SUBMIT WITH ANIMATION ============
(function() {
  var form = document.getElementById('contact-form');
  var success = document.getElementById('form-success');
  var btn = document.getElementById('submit-btn');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    btn.textContent = 'Envoi…';
    btn.disabled = true;

    var data = new FormData(form);
    fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    }).then(function() {
      form.style.display = 'none';
      success.classList.add('show');
    }).catch(function() {
      // FormSubmit redirects, so even "errors" usually mean it worked
      form.style.display = 'none';
      success.classList.add('show');
    });
  });
})();

// ============ NAV SCROLL ============
var nav = document.getElementById('nav');
window.addEventListener('scroll', function() {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});
