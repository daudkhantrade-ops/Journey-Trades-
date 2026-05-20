'use strict';

/*
 * Journey Trades — script.js  FINAL
 *
 * ROOT CAUSE FIX:
 * The previous approach relied on CSS opacity/visibility to hide .mobile-nav
 * while display:block was always set by the media query on mobile.
 * On Android WebView / mobile Chrome, position:fixed + will-change +
 * visibility:hidden does not reliably suppress painting — children bleed
 * through, causing the overlap bug.
 *
 * THE FIX: CSS never makes .mobile-nav visible. It is display:none always.
 * JavaScript alone toggles display via element.style.display.
 * No opacity, no visibility, no will-change dependency for show/hide.
 */

const PAGE_LOAD_TIME = Date.now();
let _closeNav = null;


/* ─── 1. NAVBAR ────────────────────────────────────────────── */
(function initNavbar() {
  const nav       = document.getElementById('main-nav');
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');

  if (!nav || !hamburger || !mobileNav) return;

  /* Guarantee hidden state regardless of CSS */
  mobileNav.style.display = 'none';

  /* Transparent → solid on scroll */
  nav.classList.add('nav-transparent');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 80) {
      nav.classList.remove('nav-transparent');
      nav.classList.add('nav-solid');
    } else {
      nav.classList.remove('nav-solid');
      nav.classList.add('nav-transparent');
    }
  }, { passive: true });

  var isOpen = false;
  var lockY  = 0;

  function toggleMenu(open) {
    isOpen = open;

    /* Show / hide the panel */
    mobileNav.style.display = open ? 'block' : 'none';

    /* Hamburger icon animation */
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    mobileNav.setAttribute('aria-hidden',   String(!open));

    /* iOS-safe body scroll lock */
    if (open) {
      lockY = window.scrollY;
      document.body.style.overflow  = 'hidden';
      document.body.style.position  = 'fixed';
      document.body.style.top       = '-' + lockY + 'px';
      document.body.style.width     = '100%';
    } else {
      document.body.style.overflow  = '';
      document.body.style.position  = '';
      document.body.style.top       = '';
      document.body.style.width     = '';
      window.scrollTo(0, lockY);
    }
  }

  /* Expose to sibling modules */
  _closeNav = function () { toggleMenu(false); };

  /* Hamburger click — stopPropagation prevents the document
     click handler from immediately closing the menu */
  hamburger.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleMenu(!isOpen);
  });

  /* Links inside the panel */
  mobileNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { toggleMenu(false); });
  });

  /* Tap outside */
  document.addEventListener('click', function (e) {
    if (isOpen && !nav.contains(e.target) && !mobileNav.contains(e.target)) {
      toggleMenu(false);
    }
  });

  /* Escape key */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) {
      toggleMenu(false);
      hamburger.focus();
    }
  });
})();


/* ─── 2. HERO SLIDESHOW ────────────────────────────────────── */
(function initHeroSlideshow() {
  var slides   = Array.from(document.querySelectorAll('.hero-slide'));
  if (!slides.length) return;

  var current  = 0;
  var timer    = null;
  var DURATION = 5000;

  function preload(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var img   = new Image();
      img.onload  = function () { resolve(src); };
      img.onerror = function () { resolve(null); };
      img.src     = src;
    });
  }

  function goTo(idx) {
    slides[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
  }

  function start() {
    if (!timer && slides.length > 1) {
      timer = setInterval(function () { goTo(current + 1); }, DURATION);
    }
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  /* Load first slide, then start rotation */
  var first = slides[0].getAttribute('data-src') || '';
  preload(first).then(function (src) {
    if (src) slides[0].style.backgroundImage = 'url("' + src + '")';
    slides[0].classList.add('active');

    slides.slice(1).forEach(function (slide) {
      var s = slide.getAttribute('data-src') || '';
      preload(s).then(function (r) {
        if (r) slide.style.backgroundImage = 'url("' + r + '")';
      });
    });

    start();
  });

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });
})();


/* ─── 3. SCROLL REVEAL ─────────────────────────────────────── */
(function initReveal() {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el       = entry.target;
      var siblings = el.parentElement
        ? Array.from(el.parentElement.querySelectorAll('.reveal:not(.visible)'))
        : [];
      var delay = Math.min(siblings.indexOf(el) * 80, 320);
      setTimeout(function () { el.classList.add('visible'); }, delay);
      observer.unobserve(el);
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -50px 0px' });

  els.forEach(function (el) { observer.observe(el); });
})();


/* ─── 4. ACTIVE NAV LINK ───────────────────────────────────── */
(function initActiveNav() {
  var sections = document.querySelectorAll('section[id]');
  var links    = document.querySelectorAll('.nav-links a[href^="#"]');
  if (!sections.length || !links.length) return;

  new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var id = entry.target.getAttribute('id');
      links.forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + id);
      });
    });
  }, { rootMargin: '-25% 0px -65% 0px' }).observe
    ? (function () {
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var id = entry.target.getAttribute('id');
            links.forEach(function (link) {
              link.classList.toggle('active', link.getAttribute('href') === '#' + id);
            });
          });
        }, { rootMargin: '-25% 0px -65% 0px' });
        sections.forEach(function (sec) { obs.observe(sec); });
      })()
    : null;
})();


/* ─── 5. SMOOTH SCROLL ─────────────────────────────────────── */
(function initSmoothScroll() {
  var navH = function () {
    return parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '68',
      10
    );
  };

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href   = this.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      /* Close nav via shared function — cleans up scroll-lock too */
      if (_closeNav) _closeNav();

      setTimeout(function () {
        var top = target.getBoundingClientRect().top + window.scrollY - navH();
        window.scrollTo({ top: top, behavior: 'smooth' });
      }, 10);
    });
  });
})();


/* ─── 6. CONTACT FORM ──────────────────────────────────────── */
(function initContactForm() {
  var form      = document.getElementById('enquiry-form');
  var submitBtn = document.getElementById('form-submit-btn');
  var successEl = document.getElementById('form-success');
  if (!form) return;

  form.querySelectorAll('input, select, textarea').forEach(function (field) {
    field.addEventListener('input',  function () { clearError(field); });
    field.addEventListener('change', function () { clearError(field); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (Date.now() - PAGE_LOAD_TIME < 3000) return;
    if (!validateForm()) return;

    setLoading(true);
    fetch(form.action, {
      method:  'POST',
      body:    new FormData(form),
      headers: { 'Accept': 'application/json' }
    })
    .then(function (res) {
      if (res.ok) { showSuccess(); } else { form.submit(); }
    })
    .catch(function () { form.submit(); })
    .finally(function () { setLoading(false); });
  });

  function validateForm() {
    var valid = true;
    form.querySelectorAll('[required]').forEach(function (field) {
      clearError(field);
      var val = field.value.trim();
      if (!val) {
        showError(field, 'This field is required.');
        valid = false;
      } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        showError(field, 'Please enter a valid email address.');
        valid = false;
      }
    });
    return valid;
  }

  function showError(field, msg) {
    field.classList.add('invalid');
    var el = field.closest('.form-group') && field.closest('.form-group').querySelector('.form-error');
    if (el) el.textContent = msg;
  }

  function clearError(field) {
    field.classList.remove('invalid');
    var el = field.closest('.form-group') && field.closest('.form-group').querySelector('.form-error');
    if (el) el.textContent = '';
  }

  function setLoading(state) {
    submitBtn.disabled = state;
    submitBtn.classList.toggle('loading', state);
  }

  function showSuccess() {
    form.style.display = 'none';
    if (successEl) {
      successEl.classList.add('visible');
      successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
})();
