/* ==========================================================================
   TANCE — Create & Observe
   Neural threads · silent digital universe
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Neural net background                                              */
  /* ------------------------------------------------------------------ */
  function initNeuralNet() {
    var canvas = document.getElementById('neural-net');
    if (!canvas) return;

    var prefersReduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    var ctx = canvas.getContext('2d');

    var w = 0, h = 0, dpr = 1;
    var nodes = [];
    var rafId = null;

    var mouse = { x: -9999, y: -9999, active: false };

    // Tuning
    var DENSITY     = 0.000055;  // nodes per pixel² — keep it sparse
    var MAX_NODES   = 90;
    var MIN_NODES   = 28;
    var LINK_DIST   = 170;       // px (CSS)
    var MOUSE_DIST  = 160;       // px (CSS)
    var DRIFT       = 0.12;      // base drift speed
    var FRICTION    = 0.985;     // velocity damping
    var ATTRACTION  = 0.0018;    // mouse pull (very soft)

    function setSize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      var count = Math.round(w * h * DENSITY);
      count = Math.max(MIN_NODES, Math.min(MAX_NODES, count));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * DRIFT,
          vy: (Math.random() - 0.5) * DRIFT,
          // tiny phase for subtle pulse
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function step(time) {
      ctx.clearRect(0, 0, w, h);

      var t = time * 0.001;

      // Update & draw nodes
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];

        // Mouse soft attraction
        if (mouse.active) {
          var mdx = mouse.x - n.x;
          var mdy = mouse.y - n.y;
          var md = Math.sqrt(mdx * mdx + mdy * mdy);
          if (md < MOUSE_DIST && md > 0.1) {
            var pull = (1 - md / MOUSE_DIST) * ATTRACTION;
            n.vx += mdx * pull;
            n.vy += mdy * pull;
          }
        }

        n.vx *= FRICTION;
        n.vy *= FRICTION;

        // Add a tiny constant drift so the field never freezes
        n.x += n.vx + Math.sin(t * 0.3 + n.phase) * 0.04;
        n.y += n.vy + Math.cos(t * 0.27 + n.phase) * 0.04;

        // Wrap
        if (n.x < -20) n.x = w + 20;
        else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        else if (n.y > h + 20) n.y = -20;

        // Pulse alpha (very subtle)
        var pulse = 0.55 + Math.sin(t * 0.8 + n.phase) * 0.15;
        ctx.fillStyle = 'rgba(167, 139, 250, ' + (pulse * 0.55) + ')';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw links (only when nodes are close)
      for (var a = 0; a < nodes.length; a++) {
        var na = nodes[a];
        for (var b = a + 1; b < nodes.length; b++) {
          var nb = nodes[b];
          var dx = na.x - nb.x;
          var dy = na.y - nb.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            var alpha = (1 - dist / LINK_DIST);
            // Boost line opacity if mouse is near either endpoint
            if (mouse.active) {
              var ma = Math.hypot(mouse.x - na.x, mouse.y - na.y);
              var mb = Math.hypot(mouse.x - nb.x, mouse.y - nb.y);
              var closest = Math.min(ma, mb);
              if (closest < MOUSE_DIST) {
                alpha += (1 - closest / MOUSE_DIST) * 0.35;
              }
            }
            ctx.strokeStyle = 'rgba(124, 58, 237, ' + (alpha * 0.28) + ')';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.stroke();
          }
        }
      }

      rafId = requestAnimationFrame(step);
    }

    function start() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(step);
    }

    function onResize() {
      setSize();
      spawn();
    }

    function onPointer(e) {
      var t = e.touches ? e.touches[0] : e;
      mouse.x = t.clientX;
      mouse.y = t.clientY;
      mouse.active = true;
    }

    function onPointerLeave() {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    }

    // Pause when tab is hidden — preserves CPU & battery
    function onVisibility() {
      if (document.hidden) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      } else if (!rafId) {
        start();
      }
    }

    setSize();
    spawn();
    start();

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('mousemove', onPointer, { passive: true });
    window.addEventListener('touchmove', onPointer, { passive: true });
    window.addEventListener('mouseleave', onPointerLeave, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
  }

  /* ------------------------------------------------------------------ */
  /*  Smooth anchors                                                     */
  /* ------------------------------------------------------------------ */
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var hash = link.getAttribute('href');
        if (!hash || hash.length <= 1) return;
        var target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Reveal entries on scroll (sub pages)                              */
  /* ------------------------------------------------------------------ */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    var els = document.querySelectorAll('.entry, .about-section, .sub-head');
    if (!els.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05 });

    els.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = 'opacity 600ms cubic-bezier(.22,.61,.36,1), transform 600ms cubic-bezier(.22,.61,.36,1)';
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    initNeuralNet();
    initSmoothAnchors();
    initReveal();
  });
})();
