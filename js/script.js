/* ==========================================================================
   TANCE · NEURAL ORBIT — core bundle
   Loaded by every page (including articles published before this redesign).

   1. content index  — derives the whole site's article data from the three
                       <section class="entry-list"> files, so a new post never
                       needs a second file edited.
   2. cosmos engine  — upgraded star-trail / stardust / neural-thread background
   3. motion manager — layered animation with visibility + capability control
   4. reading system — TOC, progress, anchors, code, figures, prev/next, related
   ========================================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  var SMALL = window.matchMedia
    ? window.matchMedia('(max-width: 760px)').matches
    : false;

  /* ------------------------------------------------------------------ */
  /* 1. Content index                                                    */
  /* ------------------------------------------------------------------ */
  var LIST_SOURCES = ['/create.html', '/observe.html', '/archives/index.html'];
  var SECTION_OF_SOURCE = { '/create.html': 'create', '/observe.html': 'observe' };

  var content = {
    records: [],
    byHref: {},
    projects: [],
    site: {},
    ready: null,
    settled: null,
    enriched: false,
    _enriched: {},
    _listeners: []
  };

  function absPath(href) {
    if (!href) return '';
    if (href.charAt(0) === '/') return href;
    var m = /^https?:\/\/[^/]+(\/.*)$/.exec(href);
    if (m) return m[1];
    return href;
  }

  function dateFromPath(href) {
    var m = /^\/(\d{4})\/(\d{2})\/(\d{2})\//.exec(absPath(href));
    return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
  }

  function parseDay(text) {
    var m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(text || '');
    if (!m) return '';
    return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  }

  function cleanMeta(raw) {
    var parts = String(raw || '').split('·').map(function (s) { return s.trim(); }).filter(Boolean);
    var out = { category: '', minutes: 0 };
    parts.forEach(function (p) {
      var mins = /^(\d+)\s*min/i.exec(p);
      if (mins) out.minutes = parseInt(mins[1], 10);
      else if (!out.category) out.category = p;
    });
    return out;
  }

  function parseList(doc, source) {
    var lists = doc.querySelectorAll('section.entry-list');
    var found = [];
    for (var i = 0; i < lists.length; i++) {
      var links = lists[i].querySelectorAll('a.entry');
      for (var j = 0; j < links.length; j++) {
        var a = links[j];
        var title = a.querySelector('.entry-title');
        var dateEl = a.querySelector('.entry-date');
        var lineEl = a.querySelector('.entry-line');
        var metaEl = a.querySelector('.entry-meta');
        var href = absPath(a.getAttribute('href'));
        if (!href || !title) continue;
        var meta = cleanMeta(metaEl ? metaEl.textContent : '');
        var fromList = SECTION_OF_SOURCE[source];
        var section = fromList || (/create/i.test(meta.category) ? 'create' : 'observe');
        found.push({
          href: href,
          slug: href.replace(/^\/|\/$/g, ''),
          title: title.textContent.trim(),
          date: dateFromPath(href) || parseDay(dateEl ? dateEl.textContent : ''),
          dateLabel: (dateEl ? dateEl.textContent : '').trim(),
          excerpt: lineEl ? lineEl.textContent.trim() : '',
          category: meta.category,
          minutes: meta.minutes,
          section: section,
          tags: [],
          source: source
        });
      }
    }
    return found;
  }

  function isPostHref(href) {
    return /^\/\d{4}\/\d{2}\/\d{2}\//.test(absPath(href));
  }

  // The article page itself is the source of truth for section, tags and length.
  function enrich(rec) {
    if (content._enriched[rec.href]) return content._enriched[rec.href];
    var task = fetch(rec.href, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        var d = new DOMParser().parseFromString(html, 'text/html');
        var body = d.querySelector('.post-body');
        var eyebrow = d.querySelector('.post-eyebrow');
        var time = d.querySelector('.post-meta time');
        var text = body ? body.textContent.replace(/\s+/g, ' ').trim() : '';
        var words = text ? text.split(/\s+/).length : 0;
        var cjk = (text.match(/[一-龥]/g) || []).length;
        var minutes = Math.max(1, Math.round((cjk / 380) + (Math.max(0, words - cjk) / 240)));

        var eb = (eyebrow ? eyebrow.textContent : '').trim();
        var ebParts = eb.split('·').map(function (s) { return s.trim(); }).filter(Boolean);
        var section = /create/i.test(eb) ? 'create' : (/observe/i.test(eb) ? 'observe' : rec.section);
        var category = ebParts[1] || rec.category || (ebParts[0] || '');

        var metaBits = [];
        var meta = d.querySelectorAll('.post-meta span');
        for (var i = 0; i < meta.length; i++) {
          var t = meta[i].textContent.trim();
          // "3 min" and the agent's "约 3 min" are reading time, not tags.
          if (t && t !== '·' && !/^[约~≈]?\s*\d+\s*min$/i.test(t)) metaBits.push(t);
        }
        var tags = metaBits.join(' / ').split(/[\/,，]/).map(function (s) { return s.trim(); })
          .filter(function (s) { return s && s.length < 28 && !/^(Create|Observe|项目|思考|复盘|学习|灵感|自动发布)$/i.test(s); });

        rec.section = section;
        rec.category = category;
        rec.tags = tags;
        rec.minutes = rec.minutes || minutes;
        rec.autoMinutes = minutes;
        rec.date = (time && time.getAttribute('datetime')) || rec.date;
        rec.plain = text;
        if (!rec.excerpt) {
          var firstP = body ? body.querySelector('p') : null;
          rec.excerpt = firstP ? firstP.textContent.trim().slice(0, 150) : text.slice(0, 130);
        }
        rec.headings = [];
        var hs = d.querySelectorAll('.post-body h2, .post-body h3');
        for (var h = 0; h < hs.length; h++) {
          rec.headings.push({ level: hs[h].tagName.toLowerCase(), text: hs[h].textContent.trim() });
        }
        rec.quotes = [];
        var qs = d.querySelectorAll('.post-body blockquote, .post-body .callout');
        for (var q = 0; q < qs.length; q++) {
          var qt = qs[q].textContent.replace(/\s+/g, ' ').trim();
          if (qt.length > 12 && qt.length < 220) rec.quotes.push(qt);
        }
        content._enriched[rec.href] = true;
        return rec;
      })
      .catch(function () {
        content._enriched[rec.href] = true;
        return rec;
      });
    content._enriched[rec.href] = task;
    return task;
  }

  function emit() {
    content._listeners.forEach(function (fn) {
      try { fn(content); } catch (e) { /* a section failing must not break others */ }
    });
  }

  function buildIndex() {
    return Promise.all(LIST_SOURCES.map(function (src) {
      return fetch(src, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (html) {
          return parseList(new DOMParser().parseFromString(html, 'text/html'), src);
        })
        .catch(function () { return []; });
    })).then(function (chunks) {
      var seen = {};
      chunks.forEach(function (list) {
        list.forEach(function (rec) {
          if (seen[rec.href]) {
            // Prefer the richer of the two occurrences.
            var old = seen[rec.href];
            if (rec.excerpt && !old.excerpt) old.excerpt = rec.excerpt;
            return;
          }
          seen[rec.href] = rec;
        });
      });
      content.records = Object.keys(seen).map(function (k) { return seen[k]; })
        .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
      content.byHref = seen;
      emit();
      return content.records;
    });
  }

  content.load = function () {
    if (content.ready) return content.ready;
    content.ready = Promise.all([
      buildIndex(),
      fetchJSON('/data/projects.json'),
      fetchJSON('/data/site.json')
    ]).then(function (res) {
      content.projects = res[1] || [];
      content.site = res[2] || {};
      emit();
      // Enrich every article in one parallel batch and notify once, instead of
      // re-rendering all sections per article — repeated reflow used to throw
      // the reader's scroll position around while the page was still loading.
      content.settled = Promise.all(
        content.posts().filter(function (r) { return isPostHref(r.href); }).map(enrich)
      ).then(function () {
        content.enriched = true;
        emit();
        return content;
      });
      return content;
    });
    return content.ready;
  };

  function fetchJSON(url) {
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  content.posts = function () {
    return content.records.filter(function (r) { return isPostHref(r.href); });
  };

  content.inSection = function (name) {
    return content.posts().filter(function (r) { return r.section === name; });
  };

  content.find = function (href) { return content.byHref[absPath(href)] || null; };

  content.tagMap = function () {
    var map = {};
    content.posts().forEach(function (r) {
      var keys = (r.tags || []).slice();
      if (r.category) keys.push(r.category);
      keys.push(r.section === 'create' ? 'Create' : 'Observe');
      keys.forEach(function (k) {
        k = String(k).trim();
        if (!k || k.length > 24) return;
        (map[k] = map[k] || { tag: k, hrefs: [] }).hrefs.push(r.href);
      });
    });
    content.projects.forEach(function (p) {
      (p.topics || []).forEach(function (k) {
        k = String(k).trim();
        if (!k) return;
        (map[k] = map[k] || { tag: k, hrefs: [] }).projects =
          (map[k].projects || []).concat([p.slug]);
      });
    });
    return map;
  };

  content.search = function (q) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return content.posts();
    var need = q.split(/\s+/);
    return content.posts().filter(function (r) {
      var hay = [r.title, r.excerpt, r.category, (r.tags || []).join(' '), r.plain || '']
        .join(' ').toLowerCase();
      return need.every(function (n) { return hay.indexOf(n) !== -1; });
    });
  };

  content.related = function (rec, limit) {
    if (!rec) return [];
    var own = {};
    (rec.tags || []).concat([rec.category, rec.section]).forEach(function (t) { own[String(t).toLowerCase()] = 1; });
    return content.posts()
      .filter(function (r) { return r.href !== rec.href; })
      .map(function (r) {
        var score = 0;
        (r.tags || []).concat([r.category, r.section]).forEach(function (t) {
          if (own[String(t).toLowerCase()]) score += 1;
        });
        if (r.section === rec.section) score += 0.5;
        return { r: r, score: score };
      })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 3)
      .map(function (x) { return x.r; });
  };

  content.on = function (fn) { content._listeners.push(fn); fn(content); };
  content.REDUCED = REDUCED;
  content.SMALL = SMALL;

  /* ------------------------------------------------------------------ */
  /* 2. Cosmos engine — upgraded from the original neural-thread field    */
  /* ------------------------------------------------------------------ */
  // Tuning knobs per device tier.
  var TIERS = {
    full: { nodes: 90, link: 170, trail: 3, trailPts: 140, dust: 130, dpr: 2 },
    lite: { nodes: 46, link: 140, trail: 2, trailPts: 90, dust: 70, dpr: 1.6 }
  };

  function makeCosmos(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var tier = (opts.lite || SMALL) ? TIERS.lite : TIERS.full;
    var cfg = Object.assign({}, tier, opts.cfg || {});
    var w = 0, h = 0, dpr = 1;
    var nodes = [], dust = [], trails = [];
    var raf = null, t0 = 0, visible = true;
    var pointer = { x: -9999, y: -9999, active: false };
    var parallax = { x: 0, y: 0, tx: 0, ty: 0 };

    var lastW = 0, lastH = 0;

    function resize() {
      var rect = opts.fit
        ? canvas.getBoundingClientRect()
        : { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
      // ResizeObserver can fire for a box that did not actually change size;
      // re-seeding the whole field on those ticks was costing layout time.
      if (Math.round(rect.width) === lastW && Math.round(rect.height) === lastH) return;
      lastW = Math.round(rect.width);
      lastH = Math.round(rect.height);

      dpr = Math.min(window.devicePixelRatio || 1, cfg.dpr);
      w = Math.max(1, lastW);
      h = Math.max(1, lastH);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (opts.fit) {
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      var density = opts.density || 0.000055;
      var count = Math.round(w * h * density);
      count = Math.max(opts.minNodes || 14, Math.min(cfg.nodes, count));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          r: 0.6 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2
        });
      }
      dust = [];
      for (var d = 0; d < cfg.dust; d++) {
        dust.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.1 + 0.2,
          a: Math.random() * 0.5 + 0.12,
          sp: Math.random() * 0.06 + 0.01,
          phase: Math.random() * Math.PI * 2
        });
      }
      trails = [];
      for (var k = 0; k < cfg.trail; k++) {
        trails.push({
          rx: w * (0.26 + Math.random() * 0.5),
          ry: h * (0.16 + Math.random() * 0.34),
          rot: Math.random() * Math.PI,
          speed: (0.00004 + Math.random() * 0.00006) * (k % 2 ? -1 : 1),
          tilt: 0.32 + Math.random() * 0.3,
          hue: k % 3 === 1 ? 'pink' : 'violet',
          pts: cfg.trailPts
        });
      }
    }

    function drawTrails(t) {
      var cx = w / 2 + parallax.x * 26;
      var cy = h * 0.44 + parallax.y * 18;
      trails.forEach(function (tr) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tr.rot + t * tr.speed * 1000);
        ctx.beginPath();
        for (var i = 0; i <= tr.pts; i++) {
          var a = (i / tr.pts) * Math.PI * 2;
          var wob = Math.sin(a * 3 + t * 0.0004) * 8;
          var x = Math.cos(a) * (tr.rx + wob);
          var y = Math.sin(a) * (tr.rx * tr.tilt + wob * 0.4);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = tr.hue === 'pink'
          ? 'rgba(242,168,236,0.055)'
          : 'rgba(157,112,255,0.075)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // A brighter head travelling along the same orbit.
        var head = (t * 0.00016 * (tr.speed > 0 ? 1 : -1) + tr.rot) % (Math.PI * 2);
        var hx = Math.cos(head) * tr.rx;
        var hy = Math.sin(head) * (tr.rx * tr.tilt);
        var g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 26);
        g.addColorStop(0, tr.hue === 'pink' ? 'rgba(242,168,236,0.5)' : 'rgba(214,170,255,0.55)');
        g.addColorStop(1, 'rgba(157,112,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(hx, hy, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function frame(time) {
      var t = time || 0;
      ctx.clearRect(0, 0, w, h);

      // L1 breathing nebula wash
      var pulse = 0.5 + Math.sin(t * 0.00035) * 0.5;
      var neb = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, Math.max(w, h) * 0.7);
      neb.addColorStop(0, 'rgba(103,56,206,' + (0.05 + pulse * 0.03) + ')');
      neb.addColorStop(1, 'rgba(103,56,206,0)');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, w, h);

      drawTrails(t);

      // Stardust
      dust.forEach(function (p) {
        p.y -= p.sp;
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
        var tw = p.a * (0.6 + Math.sin(t * 0.0012 + p.phase) * 0.4);
        ctx.fillStyle = 'rgba(244,238,255,' + tw.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x + parallax.x * 12, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Neural threads
      nodes.forEach(function (n) {
        if (pointer.active) {
          var dx = pointer.x - n.x, dy = pointer.y - n.y;
          var dist = Math.hypot(dx, dy);
          if (dist < 170 && dist > 0.5) {
            var pull = (1 - dist / 170) * 0.0018;
            n.vx += dx * pull;
            n.vy += dy * pull;
          }
        }
        n.vx *= 0.985; n.vy *= 0.985;
        n.x += n.vx + Math.sin(t * 0.0003 + n.phase) * 0.04;
        n.y += n.vy + Math.cos(t * 0.00027 + n.phase) * 0.04;
        if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;

        var glow = 0.5 + Math.sin(t * 0.0008 + n.phase) * 0.18;
        ctx.fillStyle = 'rgba(214,170,255,' + (glow * 0.6).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      });

      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var na = nodes[a], nb = nodes[b];
          var d2 = Math.hypot(na.x - nb.x, na.y - nb.y);
          if (d2 > cfg.link) continue;
          var alpha = (1 - d2 / cfg.link) * 0.3;
          if (pointer.active) {
            var near = Math.min(Math.hypot(pointer.x - na.x, pointer.y - na.y),
                                Math.hypot(pointer.x - nb.x, pointer.y - nb.y));
            if (near < 170) alpha += (1 - near / 170) * 0.3;
          }
          ctx.strokeStyle = 'rgba(124,58,237,' + Math.min(1, alpha).toFixed(3) + ')';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(na.x, na.y);
          ctx.lineTo(nb.x, nb.y);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(frame);
    }

    function staticFrame() {
      ctx.clearRect(0, 0, w, h);
      drawTrails(2000);
      dust.forEach(function (p) {
        ctx.fillStyle = 'rgba(244,238,255,' + (p.a * 0.7).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      nodes.forEach(function (n) {
        ctx.fillStyle = 'rgba(214,170,255,0.4)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function start() {
      if (REDUCED) { staticFrame(); return; }
      if (raf) return;
      visible = true;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    var ro = new ResizeObserver(function () { resize(); if (REDUCED) staticFrame(); });
    ro.observe(canvas);
    resize();

    if (opts.pointer !== false) {
      canvas.parentElement && canvas.parentElement.addEventListener('pointermove', function (e) {
        var rect = canvas.getBoundingClientRect();
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
        pointer.active = true;
        parallax.tx = (pointer.x / w - 0.5) * 2;
        parallax.ty = (pointer.y / h - 0.5) * 2;
      }, { passive: true });
      canvas.parentElement && canvas.parentElement.addEventListener('pointerleave', function () {
        pointer.active = false;
        pointer.x = pointer.y = -9999;
      }, { passive: true });
    }

    // Parallax easing rides the same rAF loop.
    (function ease() {
      parallax.x += (parallax.tx - parallax.x) * 0.06;
      parallax.y += (parallax.ty - parallax.y) * 0.06;
      requestAnimationFrame(ease);
    })();

    return { start: start, stop: stop, canvas: canvas, resize: resize };
  }

  /* ------------------------------------------------------------------ */
  /* 3. Motion manager — only what is on screen animates                  */
  /* ------------------------------------------------------------------ */
  var engines = [];

  function registerEngine(inst, el) {
    if (!inst) return;
    engines.push({ inst: inst, el: el || inst.canvas });
    observeEngine(inst, el || inst.canvas);
    inst.start();
  }

  function observeEngine(inst, el) {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) inst.start(); else inst.stop();
      });
    }, { rootMargin: '120px' });
    io.observe(el);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) engines.forEach(function (e) { e.inst.stop(); });
    else engines.forEach(function (e) { e.inst.start(); });
  });

  /* ------------------------------------------------------------------ */
  /* Reveal + section triggers                                           */
  /* ------------------------------------------------------------------ */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.06 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  // Generic on-screen trigger used by manifesto lines, timeline nodes etc.
  function litObserver(selector, cls, threshold) {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll(selector).forEach(function (el) { el.classList.add(cls || 'is-lit'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add(cls || 'is-lit');
        else if (!REDUCED) e.target.classList.remove(cls || 'is-lit');
      });
    }, { threshold: threshold === undefined ? 0.4 : threshold });
    document.querySelectorAll(selector).forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Reading system                                                   */
  /* ------------------------------------------------------------------ */
  function currentHref() { return location.pathname; }

  function initArticle() {
    var shell = document.querySelector('.post-shell');
    var body = document.querySelector('.post-body');
    if (!shell || !body) return;

    // Articles published before the rail existed have flat children; group
    // them so the two-column reading layout is the same for every post.
    var main = shell.querySelector('.post-main');
    if (!main) {
      main = document.createElement('div');
      main.className = 'post-main';
      var foot = shell.querySelector('.post-foot');
      while (shell.firstChild && shell.firstChild !== foot) main.appendChild(shell.firstChild);
      shell.insertBefore(main, foot || null);
    }

    var isObserve = /observe/i.test((document.querySelector('.post-eyebrow') || {}).textContent || '')
      || /\/auto-observe\b/.test(location.pathname);
    if (isObserve) document.body.classList.add('variant-observe');

    var idMap = {};
    body.querySelectorAll('h2, h3').forEach(function (h, i) {
      if (!h.id) h.id = 's' + (i + 1) + '-' + (h.textContent.trim().slice(0, 12).replace(/[^\w一-龥]+/g, '-') || i);
      idMap[h.id] = h;
    });

    var headings = [].slice.call(body.querySelectorAll('h2, h3'));
    var hasRail = headings.length >= 2;
    // Only widen into two columns when there is something to put in the rail,
    // otherwise the article would sit next to an empty 232px gutter.
    if (hasRail) document.body.classList.add('has-rail');

    var shellIsGrid = getComputedStyle(shell).display === 'grid';

    // Build rail
    var rail = document.createElement('aside');
    rail.className = 'post-rail';
    rail.setAttribute('aria-label', '目录与关联内容');

    var toggle = document.createElement('button');
    toggle.className = 'toc-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '目录 contents';
    rail.appendChild(toggle);

    var label = document.createElement('span');
    label.className = 'rail-label';
    label.textContent = 'Contents';
    rail.appendChild(label);

    var toc = document.createElement('nav');
    toc.className = 'toc';
    rail.appendChild(toc);

    var railExtra = document.createElement('div');
    railExtra.className = 'rail-block';
    railExtra.innerHTML = '<span class="rail-label">Linked</span><div class="rail-list" data-rail-links></div>';
    rail.appendChild(railExtra);

    if (shellIsGrid) {
      shell.appendChild(rail);
    } else {
      rail.classList.add('is-inline');
      shell.insertBefore(rail, shell.firstChild);
    }

    if (hasRail) {
      headings.forEach(function (h) {
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.className = 'toc-' + h.tagName.toLowerCase();
        a.textContent = h.textContent.trim();
        a.addEventListener('click', function (e) {
          e.preventDefault();
          h.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
          history.replaceState(null, '', '#' + h.id);
        });
        toc.appendChild(a);

        // Anchor marker on the heading itself
        var link = document.createElement('a');
        link.className = 'anchor-link';
        link.href = '#' + h.id;
        link.setAttribute('aria-label', '本节锚点');
        link.textContent = '#';
        h.appendChild(link);
      });
    } else {
      rail.hidden = true;
      toc.style.display = 'none';
      label.style.display = 'none';
      railExtra.style.display = 'none';
    }

    toggle.addEventListener('click', function () {
      var open = rail.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Reading progress
    var bar = document.createElement('div');
    bar.className = 'read-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var doc = document.documentElement;
        var max = doc.scrollHeight - doc.clientHeight;
        var p = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
        bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        var active = null;
        for (var i = 0; i < headings.length; i++) {
          if (headings[i].getBoundingClientRect().top <= 120) active = headings[i];
          else break;
        }
        toc.querySelectorAll('a').forEach(function (a) {
          a.classList.toggle('is-active', !!active && a.getAttribute('href') === '#' + active.id);
        });
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    // Code blocks: language label + copy
    body.querySelectorAll('pre').forEach(function (pre) {
      var code = pre.querySelector('code');
      if (!code || pre.querySelector('.code-bar')) return;
      pre.appendChild(makeCodeBar(pre, code));
      highlight(code);
    });

    // Images: caption support + click to zoom
    body.querySelectorAll('img').forEach(function (img) {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
      img.dataset.zoom = '1';
    });
    body.addEventListener('click', function (e) {
      if (e.target.tagName === 'IMG' && e.target.dataset.zoom) openLightbox(e.target.currentSrc || e.target.src);
    });

    // Callout: "> 注意：…" becomes a marked block
    body.querySelectorAll('blockquote').forEach(function (bq) {
      var txt = bq.textContent.trim();
      var m = /^(注意|提示|警告|重要|Note|Warning|Tip)[:：]\s*([\s\S]*)$/i.exec(txt);
      if (!m) return;
      var div = document.createElement('div');
      div.className = 'callout';
      div.innerHTML = '<span class="callout-label"></span>';
      div.firstChild.textContent = m[1];
      var rest = document.createElement('span');
      rest.textContent = m[2];
      div.appendChild(rest);
      bq.replaceWith(div);
    });

    // GitHub links inside the article become repo cards
    body.querySelectorAll('a[href*="github.com/"]').forEach(function (a) {
      var m = /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)/.exec(a.href);
      if (!m || a.closest('.repo-card')) return;
      var known = (content.projects || []).filter(function (p) { return p.slug === m[2]; })[0];
      var card = document.createElement('div');
      card.className = 'repo-card';
      card.innerHTML =
        '<span class="repo-glyph">◆</span>' +
        '<a class="repo-name" href="' + a.href + '" target="_blank" rel="noopener"></a>' +
        '<span class="repo-desc"></span>';
      card.querySelector('.repo-name').textContent = m[1] + '/' + m[2];
      card.querySelector('.repo-desc').textContent = known
        ? (known.tagline || known.summary || '')
        : 'GitHub repository';
      if (a.parentElement && a.parentElement.childNodes.length <= 3 && a.parentElement.tagName === 'P') {
        a.parentElement.replaceWith(card);
      } else {
        a.parentElement.insertBefore(card, a);
      }
    });

    // Share / copy link
    var tools = document.createElement('div');
    tools.className = 'post-tools';
    tools.appendChild(chipLink('复制链接', location.href.split('#')[0]));
    tools.appendChild(chipLink('RSS', '/feed.xml'));
    var meta = document.querySelector('.post-meta');
    if (meta && meta.parentNode) meta.parentNode.insertBefore(tools, meta.nextSibling);

    // Prev / next / related / tags — after the index is in
    content.on(function () { fillArticleNav(body, shell); });
  }

  function chipLink(text, href) {
    var a = document.createElement('a');
    a.className = 'chip';
    a.href = href;
    a.textContent = text;
    if (text === '复制链接') {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var done = function () {
          a.textContent = '已复制';
          a.classList.add('is-active');
          setTimeout(function () { a.textContent = text; a.classList.remove('is-active'); }, 1600);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(href).then(done, done);
        else { location.href = href; }
      });
    }
    return a;
  }

  function makeCodeBar(pre, code) {
    var bar = document.createElement('div');
    bar.className = 'code-bar';
    var lang = document.createElement('span');
    lang.className = 'code-lang';
    var cls = (code.className || '').match(/language-([\w+#-]+)/);
    lang.textContent = cls ? cls[1] : 'code';
    var btn = document.createElement('button');
    btn.className = 'code-copy';
    btn.type = 'button';
    btn.textContent = 'copy';
    btn.addEventListener('click', function () {
      var text = code.innerText;
      var ok = function () { btn.textContent = 'copied'; btn.classList.add('is-done'); setTimeout(function () { btn.textContent = 'copy'; btn.classList.remove('is-done'); }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, ok);
      else ok();
    });
    bar.appendChild(lang);
    bar.appendChild(btn);
    return bar;
  }

  // Small, dependency-free tokeniser — enough for the code samples on this site.
  var KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|await|async|class|new|import|from|export|def|self|true|false|None|null|undefined|try|except|catch|throw|in|of|with|as|pass|lambda|print|SELECT|FROM|WHERE|INSERT|UPDATE)\b/g;

  function highlight(code) {
    var text = code.textContent;
    if (text.length > 4000) return;
    var out = '';
    var i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (ch === '/' && text[i + 1] === '/') {
        var end = text.indexOf('\n', i);
        if (end === -1) end = text.length;
        out += esc(text.slice(i, end), 'com');
        i = end;
        continue;
      }
      if (ch === '#' && /^[ \t]*$/.test(text.slice(text.lastIndexOf('\n', i - 1) + 1, i))) {
        var e2 = text.indexOf('\n', i);
        if (e2 === -1) e2 = text.length;
        out += esc(text.slice(i, e2), 'com');
        i = e2;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        var j = i + 1;
        while (j < text.length && text[j] !== ch) j += text[j] === '\\' ? 2 : 1;
        out += esc(text.slice(i, Math.min(j + 1, text.length)), 'str');
        i = j + 1;
        continue;
      }
      if (/\d/.test(ch) && !/[\w-]/.test(text[i - 1] || '')) {
        var k = i;
        while (k < text.length && /[\d.]/.test(text[k])) k++;
        out += esc(text.slice(i, k), 'num');
        i = k;
        continue;
      }
      var word = /^[A-Za-z_$][\w$]*/.exec(text.slice(i));
      if (word) {
        var isKey = KEYWORDS.test(word[0]);
        KEYWORDS.lastIndex = 0;
        var isFn = /^\s*\(/.test(text.slice(i + word[0].length));
        out += esc(word[0], isKey ? 'key' : isFn ? 'fn' : '');
        i += word[0].length;
        continue;
      }
      out += esc(ch, '');
      i++;
    }
    code.innerHTML = out;
  }

  function esc(s, cls) {
    var t = String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return cls ? '<span class="tok-' + cls + '">' + t + '</span>' : t;
  }

  var lightboxEl = null;

  function openLightbox(src) {
    if (!lightboxEl) {
      lightboxEl = document.createElement('div');
      lightboxEl.className = 'lightbox';
      lightboxEl.innerHTML = '<button class="lightbox-close" aria-label="关闭">×</button><img alt="">';
      document.body.appendChild(lightboxEl);
      lightboxEl.addEventListener('click', function () { lightboxEl.classList.remove('is-open'); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') lightboxEl.classList.remove('is-open');
      });
    }
    lightboxEl.querySelector('img').src = src;
    lightboxEl.classList.add('is-open');
  }

  function fillArticleNav(body, shell) {
    var here = currentHref();
    var rec = content.find(here) || content.find(here + '/');
    var posts = content.posts();
    if (posts.length < 2 || !rec) return;
    var idx = -1;
    for (var i = 0; i < posts.length; i++) if (posts[i].href === rec.href) idx = i;
    if (idx === -1) return;

    if (!shell.querySelector('.post-nav')) {
      var nav = document.createElement('nav');
      nav.className = 'post-nav';
      nav.setAttribute('aria-label', '上一篇与下一篇');
      // records are newest-first, so prev = newer, next = older
      [[posts[idx - 1], '下一篇更早', 'nav-prev'], [posts[idx + 1], '下一篇', 'nav-next']].forEach(function (pair) {
        var target = pair[0];
        if (!target) return;
        var a = document.createElement('a');
        a.className = pair[2];
        a.href = target.href;
        a.innerHTML = '<span class="nav-dir"></span><span class="nav-title"></span>';
        a.querySelector('.nav-dir').textContent = pair[1] === '下一篇' ? '下一篇 · next' : '上一篇 · newer';
        a.querySelector('.nav-title').textContent = target.title;
        nav.appendChild(a);
      });
      if (nav.childNodes.length) body.parentNode.insertBefore(nav, body.nextSibling);
    }

    if (!shell.querySelector('.related') && rec.tags !== undefined) {
      var rel = content.related(rec, 3);
      if (rel.length) {
        var box = document.createElement('section');
        box.className = 'related';
        box.innerHTML = '<h2 class="related-title">Related · 相关记录</h2><div class="related-list"></div>';
        rel.forEach(function (r) {
          var a = document.createElement('a');
          a.href = r.href;
          a.innerHTML = '<span></span><span class="rel-date"></span>';
          a.firstChild.textContent = r.title;
          a.querySelector('.rel-date').textContent = r.dateLabel || r.date;
          box.querySelector('.related-list').appendChild(a);
        });
        navInsert(box, shell, body);
      }

      // Tag chips in the rail
      var railList = shell.querySelector('[data-rail-links]');
      if (railList && !railList.dataset.filled) {
        railList.dataset.filled = '1';
        (rec.tags || []).forEach(function (t) {
          var a = document.createElement('a');
          a.href = '/archives/#tag-' + encodeURIComponent(t);
          a.textContent = '◇ ' + t;
          railList.appendChild(a);
        });
        (content.related(rec, 2)).forEach(function (r) {
          var a = document.createElement('a');
          a.href = r.href;
          a.textContent = '→ ' + r.title;
          railList.appendChild(a);
        });
      }
    }
  }

  function navInsert(box, shell, body) {
    var foot = shell.querySelector('.post-foot');
    if (foot) shell.insertBefore(box, foot);
    else shell.appendChild(box);
  }

  /* ------------------------------------------------------------------ */
  /* Header state                                                        */
  /* ------------------------------------------------------------------ */
  var NAV_ITEMS = [
    ['/create.html', 'Create'],
    ['/observe.html', 'Observe'],
    ['/projects/', 'Projects'],
    ['/archives/', 'Archive'],
    ['/about.html', 'About']
  ];

  // Articles published before the five-page structure existed carry a three-link
  // nav in their own HTML. Unify it at read time instead of editing nine files.
  function initNavUnify() {
    var nav = document.querySelector('.sub-nav');
    if (!nav) return;
    var path = location.pathname;
    var sectionHint = document.body.classList.contains('variant-observe') ? '/observe.html'
      : (document.querySelector('.post-shell') ? '/create.html' : null);

    nav.textContent = '';
    NAV_ITEMS.forEach(function (item) {
      var a = document.createElement('a');
      a.href = item[0];
      a.textContent = item[1];
      var current = path.indexOf(item[0]) === 0 ||
        (item[0] === '/archives/' && /^\/archives\//.test(path)) ||
        (item[0] === '/projects/' && /^\/projects\//.test(path));
      if (!current && sectionHint && item[0] === sectionHint && /^\/\d{4}\//.test(path)) current = true;
      if (current) a.className = 'is-current';
      nav.appendChild(a);
    });
  }

  function initHeaderState() {
    var head = document.querySelector('.sub-header');
    if (!head) return;
    var onScroll = function () { head.classList.toggle('is-scrolled', window.scrollY > 12); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var hash = link.getAttribute('href');
        if (!hash || hash.length <= 1) return;
        var target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    document.documentElement.classList.add('js-on');

    var bg = document.getElementById('neural-net');
    if (bg) registerEngine(makeCosmos(bg, { density: SMALL ? 0.00003 : 0.00005 }));

    initHeaderState();
    initSmoothAnchors();
    initReveal();

    if (document.querySelector('.post-shell')) initArticle();
    initNavUnify();

    content.load();
  });

  /* Exposed synchronously: universe.js and constellation.js are plain script
     tags that run right after this file, before DOMContentLoaded fires. */
  window.TANCE = {
    content: content,
    cosmos: makeCosmos,
    engine: registerEngine,
    lit: litObserver,
    reveal: initReveal,
    reduced: REDUCED,
    small: SMALL
  };
})();
