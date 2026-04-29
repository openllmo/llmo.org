// Mobile nav drawer toggle. Activated only when .mobile-nav-toggle is
// visible (below 768px viewport via main.css media query).
(function () {
  'use strict';

  var toggle = document.querySelector('.mobile-nav-toggle');
  var drawer = document.getElementById('mobile-nav-drawer');
  if (!toggle || !drawer) return;

  function setOpen(open) {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = drawer.classList.contains('is-open');
    setOpen(!open);
  });

  document.addEventListener('click', function (e) {
    if (!drawer.classList.contains('is-open')) return;
    if (drawer.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Close drawer if viewport grows past mobile breakpoint while open
  // (e.g., user rotates a tablet from portrait to landscape).
  var mq = window.matchMedia('(min-width: 769px)');
  function onMq(e) {
    if (e.matches && drawer.classList.contains('is-open')) setOpen(false);
  }
  if (mq.addEventListener) mq.addEventListener('change', onMq);
  else if (mq.addListener) mq.addListener(onMq);
})();
