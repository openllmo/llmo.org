(function () {
  var html = document.documentElement;
  var btn = document.querySelector('.theme-toggle');
  var logo = document.querySelector('.logo-mark');

  function applyLogo(theme) {
    if (!logo) return;
    var src = theme === 'dark' ? logo.dataset.darkSrc : logo.dataset.lightSrc;
    if (src && logo.src !== src) {
      logo.src = src;
    }
  }

  // Sync logo with whatever data-theme was set in the head FOUC-prevention script.
  applyLogo(html.getAttribute('data-theme') || 'light');

  if (btn) {
    btn.addEventListener('click', function () {
      var current = html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      applyLogo(next);
      try {
        localStorage.setItem('theme', next);
      } catch (e) {
        // Storage unavailable (private mode, disabled, etc.) — toggle still works for the session.
      }
    });
  }
})();
