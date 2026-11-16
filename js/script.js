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
        rec.sentences = sentencesOf(body);
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

  // Fragments have to be verbatim, so sentences are cut from the article's own
  // text: split on CJK end-of-sentence marks, never rewritten or rejoined.
  function splitSentences(text) {
    var out = [], buf = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      buf += ch;
      if ('。！？…；'.indexOf(ch) >= 0) { out.push(buf); buf = ''; }
    }
    if (buf) out.push(buf);
    return out.map(function (s) {
      return s.replace(/\s+/g, ' ').replace(/^["“」』]+|["”「『]+$/g, '').trim();
    }).filter(Boolean);
  }

  function sentencesOf(body) {
    if (!body) return [];
    var out = [];
    var nodes = body.querySelectorAll('p, li, blockquote');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      // Skip anything holding code, images or external links — those read as
      // fragments but are not sentences the author wrote to stand alone.
      if (n.querySelector('pre, code, img, a[href^="http"]')) continue;
      splitSentences(n.textContent).forEach(function (s) {
        if (out.indexOf(s) < 0) out.push(s);
      });
    }
    return out;
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

  // A fragment is either a verbatim sentence pulled out of a published article
  // or a standalone note the author wrote into data/site.json. Nothing here is
  // ever generated by paraphrasing.
  function fragmentScore(s) {
    var n = s.length;
    if (n < 14 || n > 120) return 0;
    if (/[_<>]|https?:|\.js|\.json/.test(s)) return 0;
    var v = 1;
    if (/为什么|怎么|凭什么|难道/.test(s)) v += 2;
    if (/我(想|觉得|更|先|在意|不喜欢|倾向|希望|猜|以为|说过)/.test(s)) v += 2;
    if (/不是[^，。；]{0,20}(而是|才是|只是)/.test(s)) v += 1.5;
    if (/[？?]$/.test(s)) v += 1;
    if (/其实|真正|关键|问题|风险|代价|边界|值得|应该|必须|习惯|判断|矛盾/.test(s)) v += 1;
    if (n > 96) v -= 0.5;
    return v;
  }

  function fragmentTopic(rec) {
    var c = String(rec.category || '').trim();
    if (c && c.length <= 12 && !/^Create$|^Observe$/i.test(c)) return c;
    var t = (rec.tags || [])[0];
    if (t && t.length <= 12) return t;
    return rec.section === 'create' ? '技术' : '观察';
  }

  content.fragments = function () {
    var cfg = (content.site || {}).fragments || {};
    var auto = cfg.auto || {};
    var perPost = auto.perPost || 2;
    var hidden = {};
    (cfg.hidden || []).forEach(function (t) { hidden[String(t).trim()] = true; });

    var picked = {}, curated = [], pool = [];

    (cfg.curated || []).forEach(function (c) {
      var text = String(c.text || '').trim();
      if (!text || hidden[text] || picked[text]) return;
      var src = c.from ? content.find(c.from) : null;
      picked[text] = true;
      curated.push({
        text: text,
        topic: c.topic || (src ? fragmentTopic(src) : '随想'),
        date: c.date || (src && src.date) || '',
        href: src ? src.href : '',
        title: src ? src.title : '',
        kind: src ? 'curated' : 'note'
      });
    });

    content.posts().filter(function (rec) { return isPostHref(rec.href); }).forEach(function (rec) {
      var best = (rec.sentences || [])
        .map(function (s) { return { text: s, v: fragmentScore(s) }; })
        .filter(function (x) { return x.v > 0 && !hidden[x.text] && !picked[x.text]; })
        .sort(function (a, b) { return b.v - a.v; })
        .slice(0, perPost);
      best.forEach(function (x) {
        picked[x.text] = true;
        pool.push({
          text: x.text,
          topic: fragmentTopic(rec),
          date: rec.date,
          href: rec.href,
          title: rec.title,
          kind: 'auto'
        });
      });
    });

    pool.sort(function (a, b) { return b.date < a.date ? -1 : b.date > a.date ? 1 : 0; });
    return curated.concat(pool);
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
  /* 2. Cosmos engine — a depth-layered star field                        */
  /* ------------------------------------------------------------------ */
  // The atmosphere (galactic band, orbit arcs) is CSS and costs no canvas
  // frame time. This layer only draws stars: three depth bands, a little
  // stardust, and thin threads between the near stars. No per-frame
  // gradients and no travelling glow orbs — those were the dropped frames.
  var TIERS = {
    full: { nodes: 165, link: 128, dust: 60, dpr: 2 },
    lite: { nodes: 70, link: 104, dust: 20, dpr: 1.6 }
  };

  function makeCosmos(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var tier = (opts.lite || SMALL) ? TIERS.lite : TIERS.full;
    var cfg = Object.assign({}, tier, opts.cfg || {});
    var w = 0, h = 0, dpr = 1;
    var far = [], mid = [], near = [], dust = [], linked = [];
    var raf = null;
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
      // Three bands of distance. Only the near band is allowed to move much,
      // which is what makes the field read as space instead of as noise.
      far = band(Math.round(count * 0.56), 0.5, 1.2, 0.16, 0.34);
      mid = band(Math.round(count * 0.3), 0.8, 1.6, 0.3, 0.5);
      near = band(Math.max(3, count - Math.round(count * 0.56) - Math.round(count * 0.3)),
        1.1, 2.1, 0.42, 0.68);
      dust = [];
      for (var d = 0; d < cfg.dust; d++) {
        dust.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.02,
          vy: -(Math.random() * 0.05 + 0.008),
          r: Math.random() * 1.1 + 0.2,
          a: Math.random() * 0.42 + 0.1,
          fill: '#F4EEFF',
          phase: Math.random() * Math.PI * 2,
          tw: 0.0009 + Math.random() * 0.0014
        });
      }
      linked = mid.concat(near);

      function band(n, rMin, rMax, aMin, aMax) {
        var out = [];
        for (var i = 0; i < n; i++) {
          out.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            r: rMin + Math.random() * (rMax - rMin),
            a: aMin + Math.random() * (aMax - aMin),
            // Cold blue and mist pink only appear at the rim of the field;
            // most stars stay moon-white or violet.
            fill: Math.random() < 0.08 ? '#7C9BD6'
              : Math.random() < 0.1 ? '#E7B6E2'
              : Math.random() < 0.5 ? '#D6AAFF' : '#F4EEFF',
            phase: Math.random() * Math.PI * 2,
            tw: 0.0006 + Math.random() * 0.0012
          });
        }
        return out;
      }
    }

    function paint(list, px, t, square) {
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        s.x += s.vx; s.y += s.vy;
        if (s.x < -6) s.x = w + 6; else if (s.x > w + 6) s.x = -6;
        if (s.y < -6) s.y = h + 6; else if (s.y > h + 6) s.y = -6;
        ctx.globalAlpha = s.a * (0.62 + Math.sin(t * s.tw + s.phase) * 0.38);
        ctx.fillStyle = s.fill;
        if (square) {
          ctx.fillRect(s.x + px, s.y, s.r, s.r);
        } else {
          ctx.beginPath();
          ctx.arc(s.x + px, s.y, s.r, 0, 6.2832);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function threads(px, py) {
      var reach = cfg.link, reach2 = reach * reach;
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = '#9D70FF';
      for (var a = 0; a < linked.length; a++) {
        var na = linked[a];
        for (var b = a + 1; b < linked.length; b++) {
          var nb = linked[b];
          var dx = na.x - nb.x, dy = na.y - nb.y;
          var d2 = dx * dx + dy * dy;
          if (d2 > reach2) continue;
          var alpha = (1 - d2 / reach2) * 0.15;
          if (pointer.active) {
            var mx = (na.x + nb.x) / 2 + px, my = (na.y + nb.y) / 2 + py;
            var pdx = pointer.x - mx, pdy = pointer.y - my;
            var pd2 = pdx * pdx + pdy * pdy;
            if (pd2 < 22500) alpha += (1 - pd2 / 22500) * 0.24;
          }
          ctx.globalAlpha = Math.min(0.38, alpha);
          ctx.beginPath();
          ctx.moveTo(na.x + px, na.y + py);
          ctx.lineTo(nb.x + px, nb.y + py);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    function nudge(list, strength) {
      if (!pointer.active) return;
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        var dx = pointer.x - s.x, dy = pointer.y - s.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > 28900 || d2 < 0.25) continue;
        var pull = (1 - d2 / 28900) * strength;
        s.vx += dx * pull; s.vy += dy * pull;
      }
      for (var j = 0; j < list.length; j++) {
        list[j].vx *= 0.982; list[j].vy *= 0.982;
      }
    }

    function frame(time) {
      var t = time || 0;
      parallax.x += (parallax.tx - parallax.x) * 0.05;
      parallax.y += (parallax.ty - parallax.y) * 0.05;
      ctx.clearRect(0, 0, w, h);

      nudge(near, 0.0011);
      nudge(mid, 0.0005);

      // far → near: the deeper the band, the less it answers to the cursor.
      paint(far, parallax.x * 4, t, true);
      paint(dust, parallax.x * 7, t, false);
      threads(parallax.x * 14, parallax.y * 10);
      paint(mid, parallax.x * 11, t, true);
      paint(near, parallax.x * 18, t, false);

      raf = requestAnimationFrame(frame);
    }

    function staticFrame() {
      ctx.clearRect(0, 0, w, h);
      paint(far, 0, 1200, true);
      threads(0, 0);
      paint(mid, 0, 1200, true);
      paint(near, 0, 1200, false);
      ctx.globalAlpha = 1;
    }

    function start() {
      if (REDUCED) { staticFrame(); return; }
      if (raf) return;
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

    // Parallax easing rides frame(): a second always-on rAF loop per canvas
    // kept the compositor busy even when nothing was visible.

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
    ['/fragments/', 'Fragments'],
    ['/about.html', 'About']
  ];

  // Articles published before this nav existed carry fewer links in their own
  // HTML. Unify it at read time instead of editing every article file.
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
  /* Copy-to-clipboard for the contact addresses                         */
  /* ------------------------------------------------------------------ */
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  // Clipboard writes only work on a secure context; fall back to execCommand
  // and, when even that is refused, say so instead of faking a success.
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  function initCopyButtons() {
    var buttons = document.querySelectorAll('.copy-mail[data-copy]');
    if (!buttons.length) return;

    var live = document.createElement('span');
    live.className = 'sr-only';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);

    Array.prototype.forEach.call(buttons, function (btn) {
      var idle = btn.textContent;
      var reset = null;
      btn.addEventListener('click', function () {
        var address = btn.getAttribute('data-copy');
        copyText(address).then(function (ok) {
          btn.textContent = ok ? '已复制' : '复制失败';
          btn.classList.toggle('is-done', ok);
          live.textContent = ok ? address + ' 已复制到剪贴板' : '浏览器拒绝了剪贴板写入，请选中地址手动复制';
          clearTimeout(reset);
          reset = setTimeout(function () {
            btn.textContent = idle;
            btn.classList.remove('is-done');
          }, 2200);
        });
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
    initCopyButtons();
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
