// Mobile nav drawer toggle. Activated only when .hamburger-toggle is
// visible (below 768px viewport per main.css media query).
(function () {
  'use strict';

  var toggle = document.querySelector('.hamburger-toggle');
  var drawer = document.getElementById('mobile-nav-drawer');
  if (!toggle || !drawer) return;

  function setOpen(open) {
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    var isOpen = drawer.getAttribute('aria-hidden') === 'false';
    setOpen(!isOpen);
  });

  document.addEventListener('click', function (e) {
    if (drawer.getAttribute('aria-hidden') !== 'false') return;
    if (drawer.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.getAttribute('aria-hidden') === 'false') {
      setOpen(false);
      toggle.focus();
    }
  });

  // Explicit close when a drawer link is clicked. Browser navigation
  // would close it on the next page load anyway; closing first keeps
  // the visual state consistent if navigation is delayed (slow network)
  // or cancelled (cmd-click into new tab).
  Array.prototype.forEach.call(drawer.querySelectorAll('a'), function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });

  // Close drawer if viewport grows past mobile breakpoint while open
  // (e.g., tablet rotation portrait -> landscape).
  var mq = window.matchMedia('(min-width: 769px)');
  function onMq(e) {
    if (e.matches && drawer.getAttribute('aria-hidden') === 'false') setOpen(false);
  }
  if (mq.addEventListener) mq.addEventListener('change', onMq);
  else if (mq.addListener) mq.addListener(onMq);
})();
