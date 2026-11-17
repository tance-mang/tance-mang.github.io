/* ==========================================================================
   TANCE · STAR FIELD (3D)
   A rotatable volume of this site's own content. Topics form the inner shell,
   projects the middle one, records sit around the topic they actually carry,
   and every edge is a real co-occurrence. Depth comes from perspective
   projection, not from layering flat dots.
   ========================================================================== */
(function () {
  'use strict';

  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

  var SHELL = { topic: 0.58, project: 0.9, post: 1.16, fragment: 1.42 };
  var FOCAL = 2.35;          // in shell units; smaller = stronger perspective
  var GOLDEN = 2.39996323;
  // Article titles stay hidden until the camera is close enough to read them.
  // Below this zoom a record is a cluster of light, which is the honest scale.
  var LABEL_ZOOM = 1.42;

  /* Palette V3 · violet nebula, with the ink split by space rather than mixed:
     violet holds the structure, blue the far distance and the security topics,
     pink the dust and the fragments, star-white only for the lit node. */
  var INK = {
    core: '#F5F0FF',
    topic: '#D9B3FF',
    project: '#F29CCF',
    post: '#8F59F7',
    fragment: '#E8B1EC',
    far: '#598BD8',
    near: '#90BCEB',
    gold: '#E6CFA6'
  };

  /* Visual personality types — each topic gets a distinct visual language.
     The type decides shape, motion, color accents and interaction feel.
     Assigned below from actual tag semantics; new tags auto-classify by keyword. */
  var VISUAL_TYPES = {
    // Orbit: orbital structures, dual rings, star cores
    orbit: {
      keywords: ['Agent', 'AI', '独立开发', '项目'],
      colors: { primary: '#D9B3FF', secondary: '#9D70FF', accent: '#F29CCF' },
      motion: { speed: 0.8, wobble: 0.12, pulse: 0.0004 }
    },
    // Constellation: branching structures, silver-blue paths
    constellation: {
      keywords: ['开源', '网络安全'],
      colors: { primary: '#90BCEB', secondary: '#598BD8', accent: '#E6CFA6' },
      motion: { speed: 0.6, wobble: 0.08, pulse: 0.0003 }
    },
    // Signal: data tracks, pulse lines, instrument scales
    signal: {
      keywords: ['Python', 'Java', '工具', '自动化'],
      colors: { primary: '#8F59F7', secondary: '#9D70FF', accent: '#90BCEB' },
      motion: { speed: 1.2, wobble: 0.15, pulse: 0.0006 }
    },
    // Nebula: soft clouds, text particles, pink-purple mist
    nebula: {
      keywords: ['写作', '思考', '博客', 'Observe', 'Create'],
      colors: { primary: '#F29CCF', secondary: '#E8B1EC', accent: '#D9B3FF' },
      motion: { speed: 0.4, wobble: 0.18, pulse: 0.00025 }
    },
    // Fragment: irregular crystals, broken geometry
    fragment: {
      keywords: ['游戏', '设计', '开发'],
      colors: { primary: '#E8B1EC', secondary: '#F29CCF', accent: '#90BCEB' },
      motion: { speed: 1.0, wobble: 0.2, pulse: 0.0005 }
    }
  };

  function classifyTopic(tag) {
    // Direct match first
    for (var type in VISUAL_TYPES) {
      if (VISUAL_TYPES[type].keywords.indexOf(tag) !== -1) return type;
    }
    // Keyword fallback
    for (var t in VISUAL_TYPES) {
      var kws = VISUAL_TYPES[t].keywords;
      for (var i = 0; i < kws.length; i++) {
        if (tag.indexOf(kws[i]) !== -1 || kws[i].indexOf(tag) !== -1) return t;
      }
    }
    // Default to nebula for unknown tags (soft, neutral)
    return 'nebula';
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
  }

  /* The two sections arrive through tagMap() like any other tag, but they are
     the axis the site is built on, so they get their own words and doorway. */
  var WORLD_TAGS = {
    Create: {
      href: '/create.html',
      line: '做出来并且还在跑的东西。结论要能被复现，做不到就写清楚卡在哪一步。'
    },
    Observe: {
      href: '/observe.html',
      line: '想明白和没想明白的。这里经常没有结论，有些想法放着放着就变了。'
    }
  };

  /* ------------------------------------------------------------------ */
  /* 1. Graph — the data decides the shape                               */
  /* ------------------------------------------------------------------ */
  function build(content) {
    var nodes = [];
    var index = {};
    var posts = content.posts();

    function add(node) {
      if (index[node.id]) {
        index[node.id].weight += node.weight || 0;
        return index[node.id];
      }
      index[node.id] = node;
      nodes.push(node);
      return node;
    }

    posts.forEach(function (p) {
      add({
        id: p.href, kind: 'post', label: p.title, weight: 1,
        href: p.href, date: p.date, world: p.section === 'create' ? 'create' : 'observe',
        meta: p.category || (p.section === 'create' ? 'Create' : 'Observe')
      });
    });

    (content.projects || []).forEach(function (pr) {
      add({
        id: '/projects/' + pr.slug + '/', kind: 'project', label: pr.name, weight: 2,
        href: '/projects/' + pr.slug + '/', slug: pr.slug, world: 'create',
        // A champagne mark is earned, not decorative: only projects with more
        // than one published version get one, so it means "this was iterated".
        key: (pr.versions || []).length >= 2,
        meta: pr.status || 'project'
      });
    });

    var tagMap = content.tagMap();
    var topics = Object.keys(tagMap)
      .map(function (k) { return { tag: k, hrefs: tagMap[k].hrefs || [], projects: tagMap[k].projects || [] }; })
      .filter(function (t) { return (t.hrefs.length + t.projects.length) >= 1; })
      .sort(function (a, b) { return (b.hrefs.length + b.projects.length) - (a.hrefs.length + a.projects.length); })
      .slice(0, 22);

    topics.forEach(function (t) {
      var sides = {};
      t.hrefs.forEach(function (h) {
        var rec = content.find(h);
        if (rec) sides[rec.section === 'create' ? 'create' : 'observe'] = 1;
      });
      if (t.projects.length) sides.create = 1;
      var keys = Object.keys(sides);
      var vtype = classifyTopic(t.tag);
      add({
        id: 'topic:' + t.tag, kind: 'topic', label: t.tag,
        weight: 1 + (t.hrefs.length + t.projects.length) * 0.6,
        count: t.hrefs.length + t.projects.length,
        world: keys.length > 1 ? 'both' : (keys[0] || 'both'),
        href: (WORLD_TAGS[t.tag] || {}).href || '/archives/#tag-' + encodeURIComponent(t.tag),
        hrefs: t.hrefs, projects: t.projects,
        vtype: vtype
      });
    });

    var links = [];
    var seen = {};

    function link(a, b, w, kind) {
      if (!index[a] || !index[b]) return;
      var key = a < b ? a + '|' + b : b + '|' + a;
      if (seen[key]) { seen[key].weight += w; return; }
      seen[key] = { a: a, b: b, weight: w, kind: kind };
      links.push(seen[key]);
    }

    topics.forEach(function (t) {
      var tid = 'topic:' + t.tag;
      t.hrefs.forEach(function (h) { link(tid, h, 1, 'tag'); });
      t.projects.forEach(function (s) { link(tid, '/projects/' + s + '/', 1.4, 'project'); });
    });

    /* Fragments are the outermost material: sentences that already exist on
       /fragments/, hung off the record they were taken from. Only the newest
       ones become shards — the shell has to stay readable. */
    (content.fragments ? content.fragments() : []).forEach(function (f, i) {
      if (i >= 10 || !f.href || !index[f.href]) return;
      var id = 'frag:' + i + ':' + f.href;
      if (index[id]) return;
      add({
        id: id, kind: 'fragment', label: f.text, weight: 0.4,
        href: '/fragments/', src: f.href, text: f.text, date: f.date,
        topic: f.topic, world: index[f.href].world, sourceTitle: f.title
      });
      link(id, f.href, 0.6, 'frag');
    });

    for (var i = 0; i < topics.length; i++) {
      for (var j = i + 1; j < topics.length; j++) {
        var A = topics[i].hrefs, B = topics[j].hrefs;
        if (!A.length || !B.length) continue;
        var shared = A.filter(function (h) { return B.indexOf(h) !== -1; }).length;
        if (shared >= 2) link('topic:' + topics[i].tag, 'topic:' + topics[j].tag, shared, 'co');
      }
    }

    place({ nodes: nodes, links: links }, index);
    return { nodes: nodes, links: links };
  }

  /* A flattened spiral keeps the shells readable: a full sphere of labels
     turns into fog, a disc still reads as a system. */
  function fibDir(i, n) {
    var y = n < 2 ? 0 : 1 - (i / (n - 1)) * 2;
    var r = Math.sqrt(Math.max(0.05, 1 - y * y));
    var theta = i * GOLDEN + 0.6;
    return { x: Math.cos(theta) * r, y: y * 0.66, z: Math.sin(theta) * r };
  }

  function norm(v) {
    var d = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / d, y: v.y / d, z: v.z / d };
  }

  function place(graph, index) {
    var topics = graph.nodes.filter(function (n) { return n.kind === 'topic'; });
    var byId = index;

    /* Topics sit on three inclined lanes instead of one random shell. Separate
       orbits are what makes the middle of the field legible: you can see which
       ring a topic belongs to, and the core has a clear space to sit in. */
    var ORBITS = [
      { tilt: 0.14, rise: 0.05, r: 0.94 },
      { tilt: -0.38, rise: 0.18, r: 1.03 },
      { tilt: 0.46, rise: -0.13, r: 1.12 }
    ];
    topics.forEach(function (n, i) {
      var o = ORBITS[i % ORBITS.length];
      var a = (i / Math.max(3, topics.length)) * Math.PI * 2 + hash(n.id) * 0.55;
      var rr = SHELL.topic * o.r * (0.94 + hash(n.id + 'lane') * 0.12);
      var x = Math.cos(a) * rr;
      var y = o.rise * rr + (hash(n.id + 'lift') - 0.5) * 0.1;
      var z = Math.sin(a) * rr;
      n.orbit = i % ORBITS.length;
      n.vx = x;
      n.vy = y * Math.cos(o.tilt) - z * Math.sin(o.tilt);
      n.vz = y * Math.sin(o.tilt) + z * Math.cos(o.tilt);
    });

    function homeDir(node) {
      var acc = { x: 0, y: 0, z: 0 }, got = 0;
      graph.links.forEach(function (l) {
        if (l.a !== node.id && l.b !== node.id) return;
        var other = byId[l.a === node.id ? l.b : l.a];
        if (!other || other.kind !== 'topic' || other.vx === undefined) return;
        acc.x += other.vx; acc.y += other.vy; acc.z += other.vz;
        got++;
      });
      if (!got) return null;
      return norm(acc);
    }

    graph.nodes.forEach(function (n) {
      if (n.kind === 'topic' || n.kind === 'fragment') return;
      var h = hash(n.id);
      var base = homeDir(n);
      if (!base) {
        base = fibDir(Math.floor(h * 1000), 1000);
      }
      // Push the node away from its topic so clusters stay legible instead of
      // collapsing onto the label they belong to.
      var spread = n.kind === 'post' ? 0.62 : 0.4;
      var dir = norm({
        x: base.x * 1.6 + (hash(n.id + 'x') - 0.5) * spread * 2,
        y: base.y * 1.6 + (hash(n.id + 'y') - 0.5) * spread * 2,
        z: base.z * 1.6 + (hash(n.id + 'z') - 0.5) * spread * 2
      });
      var shell = n.kind === 'post' ? SHELL.post : SHELL.project;
      var rr = shell * (0.9 + h * 0.24);
      n.vx = dir.x * rr;
      n.vy = dir.y * rr * 0.8;
      n.vz = dir.z * rr;
    });

    /* Shards drift just outside the record they were lifted from, so the outer
       dust is anchored to something real instead of being decoration. */
    graph.nodes.forEach(function (n) {
      if (n.kind !== 'fragment') return;
      var src = index[n.src];
      var h = hash(n.id);
      var base = src ? norm(src) : fibDir(Math.floor(h * 997), 997);
      var dir = norm({
        x: base.x + (h - 0.5) * 0.5,
        y: base.y + (hash(n.id + 'y') - 0.5) * 0.5,
        z: base.z + (hash(n.id + 'z') - 0.5) * 0.5
      });
      var rr = SHELL.fragment * (0.92 + h * 0.2);
      n.vx = dir.x * rr;
      n.vy = dir.y * rr * 0.62;
      n.vz = dir.z * rr;
    });

    graph.nodes.forEach(function (n) {
      n.phase = hash(n.id) * Math.PI * 2;
      // Node bodies are not interchangeable dots: a topic is a ringed star, a
      // project is a cut crystal, a record is a micro cluster, a fragment is a
      // shard. The kind is fixed by data, the variant by a stable hash.
      var v = hash(n.id + 'shape');
      if (n.kind === 'topic') {
        n.r = 5.6 + Math.min(7, (n.count || 1) * 1.1);
        // Visual personality types replace generic shapes
        n.vtype = n.vtype || classifyTopic(n.label);
        if (n.vtype === 'orbit') {
          n.shape = 'orbit-core';
        } else if (n.vtype === 'constellation') {
          n.shape = 'constellation-node';
        } else if (n.vtype === 'signal') {
          n.shape = 'signal-node';
        } else if (n.vtype === 'nebula') {
          n.shape = 'nebula-core';
        } else if (n.vtype === 'fragment') {
          n.shape = 'fragment-crystal';
        } else {
          n.shape = (n.count || 1) >= 5 ? 'core' : v < 0.5 ? 'halo' : 'cluster';
        }
      } else if (n.kind === 'project') {
        n.r = 6.6;
        n.shape = v < 0.4 ? 'crystal' : v < 0.72 ? 'prism' : 'hexagon';
      } else if (n.kind === 'fragment') {
        n.r = 4.4;
        n.shape = 'shard';
      } else {
        n.r = 3.6;
        n.shape = v < 0.55 ? 'swarm' : 'bookmark';
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Glow sprites — one radial gradient per kind, made once            */
  /* ------------------------------------------------------------------ */
  function sprites() {
    var spec = {
      topic: ['rgba(245,240,255,0.9)', 'rgba(217,179,255,0.28)', 'rgba(143,89,247,0)'],
      project: ['rgba(255,236,251,0.86)', 'rgba(242,156,207,0.24)', 'rgba(242,156,207,0)'],
      post: ['rgba(217,179,255,0.8)', 'rgba(143,89,247,0.2)', 'rgba(89,139,216,0)'],
      fragment: ['rgba(232,177,236,0.72)', 'rgba(242,156,207,0.16)', 'rgba(232,177,236,0)']
    };
    var out = {};
    Object.keys(spec).forEach(function (k) {
      var c = document.createElement('canvas');
      c.width = c.height = 96;
      var g = c.getContext('2d');
      if (!g) return;
      var grad = g.createRadialGradient(48, 48, 0, 48, 48, 48);
      grad.addColorStop(0, spec[k][0]);
      grad.addColorStop(0.34, spec[k][1]);
      grad.addColorStop(1, spec[k][2]);
      g.fillStyle = grad;
      g.fillRect(0, 0, 96, 96);
      out[k] = c;
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* 2b. The Archive Core                                                */
  /* ------------------------------------------------------------------ */
  /* One design object, drawn in two places: at the centre of the star   */
  /* field and as the hero's body at the top of the page. Scrolling down  */
  /* should read as approaching the same region of one universe, not as    */
  /* opening a second widget. Deliberately not a sphere: an irregular     */
  /* faceted nucleus, seven translucent rings on different inclinations,  */
  /* and a few light filaments. Every ring is split into a far run and a  */
  /* near run per frame, so real nodes pass behind it and in front of it.  */

  var TAU = Math.PI * 2;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // The star field and the hero share one transform, so "in front of the
  // rings" means the same thing for both.
  function mkView(cam, w, h, u, sw) {
    return {
      cy: Math.cos(cam.yaw), sy: Math.sin(cam.yaw),
      cp: Math.cos(cam.pitch), sp: Math.sin(cam.pitch),
      u: u, sw: sw,
      ox: w / 2 + (cam.px || 0), oy: h / 2 + (cam.py || 0)
    };
  }

  function proj(view, vx, vy, vz, out) {
    var x1 = vx * view.cy + vz * view.sy;
    var z1 = -vx * view.sy + vz * view.cy;
    var y2 = vy * view.cp - z1 * view.sp;
    var z2 = vy * view.sp + z1 * view.cp;
    var k = FOCAL / Math.max(0.35, FOCAL + z2);
    out.sx = view.ox + x1 * view.sw * view.u * k;
    out.sy = view.oy + y2 * view.u * k;
    out.sk = k;
    out.sz = z2;
    return out;
  }

  var CORE = (function () {
    var rings = [];
    for (var i = 0; i < 7; i++) {
      var h = hash('core-ring-' + i);
      rings.push({
        r: 0.058 + i * 0.0205 + h * 0.013,
        tiltX: -0.55 + h * 1.7 + i * 0.12,
        roll: hash('core-roll-' + i) * TAU,
        rate: (i % 2 ? -1 : 1) * (0.5 + h),
        wob: 0.05 + hash('core-wob-' + i) * 0.11,
        lobes: 2 + (i % 3),
        ph: hash('core-ph-' + i) * TAU,
        gap: hash('core-gap-' + i) * TAU,
        gapW: 0.5 + (i % 4) * 0.34,
        oy: (hash('core-oy-' + i) - 0.5) * 0.035,
        w: 0.55 + (i % 3) * 0.4,
        alpha: 0.34 - i * 0.022,
        ink: i === 4 ? 'rgba(144,188,235,1)' : i % 3 === 1 ? 'rgba(166,108,249,1)' : 'rgba(217,179,255,1)'
      });
    }
    var verts = [];
    for (var j = 0; j < 9; j++) {
      var d = fibDir(j, 9);
      var s = 0.82 + hash('core-v-' + j) * 0.5;
      verts.push({ x: d.x * s, y: d.y * s * 1.15, z: d.z * s });
    }
    return { rings: rings, verts: verts, r: 0.05 };
  })();

  function coreRings(view, now, still) {
    var passes = { far: [], near: [] };
    var STEPS = 54;
    CORE.rings.forEach(function (ring) {
      var roll = still ? ring.roll : ring.roll + now * 0.000016 * ring.rate;
      var cx = Math.cos(ring.tiltX), sx = Math.sin(ring.tiltX);
      var cz = Math.cos(roll), sz = Math.sin(roll);
      var run = null, cls = null, i;
      for (i = 0; i < STEPS; i++) {
        var a = (i / STEPS) * TAU;
        var rel = ((a - ring.gap) % TAU + TAU) % TAU;
        if (rel < ring.gapW) { run = null; cls = null; continue; }
        var rr = ring.r * (1 + ring.wob * Math.sin(a * ring.lobes + ring.ph));
        var x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        var y1 = -z * sx, z1 = z * cx;
        var p = proj(view, x * cz - y1 * sz, y1 * cz + x * sz, z1 + ring.oy, {});
        var c = p.sz >= 0 ? 'far' : 'near';
        if (c !== cls) { run = []; passes[c].push({ run: run, ring: ring }); cls = c; }
        run.push(p);
      }
    });
    return passes;
  }

  function strokeCore(ctx, passes, which, gain, zoom) {
    var list = passes[which], i, j;
    for (i = 0; i < list.length; i++) {
      var item = list[i], pts = item.run, ring = item.ring;
      if (pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      for (j = 1; j < pts.length; j++) ctx.lineTo(pts[j].sx, pts[j].sy);
      var side = which === 'near' ? 1 : 0.5;
      ctx.strokeStyle = ring.ink;
      ctx.globalAlpha = clamp(ring.alpha * side * gain, 0, 1);
      ctx.lineWidth = ring.w * side * (0.75 + zoom * 0.3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function paintNucleus(ctx, view, halo, now, gain, still) {
    var breath = still ? 1 : 1 + Math.sin(now * 0.00055) * 0.04;
    var spin = still ? 0.4 : now * 0.000035;
    var cs = Math.cos(spin), sn = Math.sin(spin);
    var r = CORE.r * breath;
    var pts = CORE.verts.map(function (v) {
      var x = v.x * r, z = v.z * r;
      return proj(view, x * cs + z * sn, v.y * r, -x * sn + z * cs, {});
    });
    var ox = 0, oy = 0, rad = 0;
    pts.forEach(function (p) { ox += p.sx; oy += p.sy; });
    ox /= pts.length; oy /= pts.length;
    pts.forEach(function (p) { rad = Math.max(rad, Math.hypot(p.sx - ox, p.sy - oy)); });
    var sorted = pts.slice().sort(function (a, b) {
      return Math.atan2(a.sy - oy, a.sx - ox) - Math.atan2(b.sy - oy, b.sx - ox);
    });

    if (halo) {
      var size = rad * (6.4 + (still ? 0 : Math.sin(now * 0.0004) * 0.5));
      ctx.globalAlpha = 0.5 * gain;
      ctx.drawImage(halo, ox - size / 2, oy - size / 2, size, size);
      ctx.globalAlpha = 1;
    }
    var g = ctx.createRadialGradient(ox - rad * 0.3, oy - rad * 0.35, rad * 0.1, ox, oy, rad * 1.05);
    g.addColorStop(0, 'rgba(245,240,255,' + (0.92 * gain).toFixed(3) + ')');
    g.addColorStop(0.42, 'rgba(166,108,249,' + (0.5 * gain).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(32,16,71,' + (0.16 * gain).toFixed(3) + ')');
    ctx.beginPath();
    sorted.forEach(function (p, i) { if (i) ctx.lineTo(p.sx, p.sy); else ctx.moveTo(p.sx, p.sy); });
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.globalAlpha = 0.55 * gain;
    ctx.strokeStyle = 'rgba(232,177,236,0.9)';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // facet seams
    ctx.globalAlpha = 0.3 * gain;
    ctx.beginPath();
    for (var i = 0; i < sorted.length; i++) {
      ctx.moveTo(sorted[i].sx, sorted[i].sy);
      ctx.lineTo(sorted[(i + 3) % sorted.length].sx, sorted[(i + 3) % sorted.length].sy);
    }
    ctx.strokeStyle = 'rgba(245,240,255,0.75)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // filaments: a few strands running out of the body along the ring planes
    var fn = 6;
    ctx.lineWidth = 0.7;
    for (var k = 0; k < fn; k++) {
      var a = (k / fn) * TAU + (still ? 0 : now * 0.00003);
      var len = 0.15 + hash('core-fil-' + k) * 0.07;
      var dy = (hash('core-fy-' + k) - 0.5) * 0.1;
      var p0 = proj(view, Math.cos(a) * r * 1.2, dy * 0.5, Math.sin(a) * r * 1.2, {});
      var p1 = proj(view, Math.cos(a) * len, dy, Math.sin(a) * len, {});
      ctx.beginPath();
      ctx.moveTo(p0.sx, p0.sy);
      ctx.quadraticCurveTo((p0.sx + p1.sx) / 2 + (p0.sy - p1.sy) * 0.14,
        (p0.sy + p1.sy) / 2 + (p1.sx - p0.sx) * 0.14, p1.sx, p1.sy);
      ctx.globalAlpha = 0.22 * gain;
      ctx.strokeStyle = k % 3 === 0 ? 'rgba(144,188,235,1)' : 'rgba(232,177,236,1)';
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // The hero and the star field draw the same body out of the same numbers.
  window.TANCEArchiveCore = {
    CORE: CORE, mkView: mkView, proj: proj, rings: coreRings,
    strokes: strokeCore, nucleus: paintNucleus, sprites: sprites
  };

  /* ------------------------------------------------------------------ */
  /* 3. Mount                                                            */
  /* ------------------------------------------------------------------ */
  function mount(root) {
    var canvas = el('#cx-canvas', root);
    var panel = el('.cx-panel', root);
    var fallback = el('.cx-fallback', root);
    var hud = el('.cx-hud', root);
    if (!canvas || !window.TANCE) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var T = window.TANCE;
    var reduced = T.reduced;
    var sprite = sprites();
    var graph = null;
    var byId = {};

    var w = 0, h = 0, dpr = 1;
    var PITCH_MAX = 1.25;
    var cam = { yaw: 0.5, pitch: -0.2, zoom: 1, tyaw: 0.5, tpitch: -0.2, tzoom: 1 };
    // Pointer parallax shifts the projection centre a little; it is an offset,
    // not a second camera, so it composes with drag and zoom without fighting.
    var par = { x: 0, y: 0, tx: 0, ty: 0 };
    var spin = !reduced;
    var vel = { yaw: 0, pitch: 0 };
    var hover = null, selected = null, pulse = null;
    // The field lights one real topic before the visitor touches anything, so
    // it never reads as decoration. It yields to the first interaction.
    var idle = null;
    var pointers = {}, dragging = null, pinch = null;
    var raf = null, running = false, last = 0;

    function unit() { return Math.min(h * 0.4, w * 0.32) * cam.zoom; }

    // A wide, short canvas needs the volume stretched sideways or the field
    // reads as a coin in the middle of an empty room.
    function spread() { return clamp(w / (h * 1.45), 1, 1.7); }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // world → screen, once per frame; everything else reads the cache.
    var view = null;
    var coreFrame = { far: [], near: [] };

    function syncView() {
      view = mkView({ yaw: cam.yaw, pitch: cam.pitch, px: par.x, py: par.y },
        w, h, unit(), spread());
    }

    function toScreen(vx, vy, vz, out) {
      return proj(view, vx, vy, vz, out);
    }

    function project() {
      if (!graph) return;
      syncView();
      graph.nodes.forEach(function (n) { toScreen(n.vx, n.vy, n.vz, n); });
    }

    /* Zooming in should reveal structure instead of inflating one object, and
       entering a topic has to push the core back without switching it off. */
    function coreGain() {
      return clamp(1.25 - (cam.zoom - 1) * 0.34, 0.55, 1.25) * focusGain();
    }

    function drawCoreFar(now) {
      coreFrame = coreRings(view, now, reduced);
      strokeCore(ctx, coreFrame, 'far', coreGain(), cam.zoom);
    }

    function drawCoreNear() {
      strokeCore(ctx, coreFrame, 'near', coreGain(), cam.zoom);
    }

    function drawNucleus(now) {
      paintNucleus(ctx, view, sprite.topic, now, coreGain(), reduced);
    }

    // Larger z2 is further from the camera; k shrinks with it.
    function depthFade(n) {
      return Math.max(0.22, Math.min(1, (1.45 - n.sz) / 2.9));
    }

    // Create / Observe is the axis the site is built on. The switch dims the
    // other side rather than removing nodes, so the shape stays legible.
    var mode = 'all';

    function dimmed(n) {
      if (!n || mode === 'all') return 1;
      return !n.world || n.world === 'both' || n.world === mode ? 1 : 0.16;
    }

    /* Entering a topic: the camera pushes in and everything that is not part of
       that topic falls back to a whisper, so the panel is describing the part
       of the sky you are actually looking at. */
    var entered = null;
    var near = {};

    function markReachable(node) {
      near = {};
      if (!node) return;
      near[node.id] = 1;
      graph.links.forEach(function (l) {
        if (l.a !== node.id && l.b !== node.id) return;
        var other = byId[l.a === node.id ? l.b : l.a];
        if (!other) return;
        near[other.id] = 1;
        // a project/article reached through the topic keeps its own halo of
        // second-order links, so the cluster reads complete rather than cut off
        graph.links.forEach(function (m) {
          if (m.a !== other.id && m.b !== other.id) return;
          var second = byId[m.a === other.id ? m.b : m.a];
          if (second) near[second.id] = 1;
        });
      });
    }

    function focusGain() {
      return entered ? 0.3 : 1;
    }

    function inFocus(n) {
      if (!entered) return 1;
      return near[n.id] ? 1 : 0.12;
    }

    /* Node bodies are cut differently per kind: a topic is a star with a
       corona or a small cluster, a project is a faceted stone, a record is a
       tick or a bookmark. Same ink, different shapes. */
    function drawBody(n, r, color, strong) {
      var x = n.sx, y = n.sy;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = strong ? 1.3 : 1;
      var s = Math.max(1.4, r);
      switch (n.shape) {
        // === Visual personality types for topics ===
        case 'orbit-core':
          // Dual orbital rings with central star core
          var vtype = VISUAL_TYPES[n.vtype] || VISUAL_TYPES.orbit;
          // Outer ring
          ctx.beginPath();
          ctx.arc(x, y, s * 1.1, 0, Math.PI * 2);
          ctx.globalAlpha *= 0.35;
          ctx.strokeStyle = vtype.colors.secondary;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          // Inner ring (offset angle)
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(n.phase * 0.3);
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 0.75, s * 0.45, 0.4, 0, Math.PI * 2);
          ctx.globalAlpha = Math.min(1, ctx.globalAlpha + 0.15) * 0.45;
          ctx.strokeStyle = vtype.colors.accent;
          ctx.stroke();
          ctx.restore();
          // Central core
          ctx.globalAlpha = Math.min(1, ctx.globalAlpha + 0.2);
          ctx.beginPath();
          ctx.arc(x, y, s * 0.38, 0, Math.PI * 2);
          ctx.fillStyle = vtype.colors.primary;
          ctx.fill();
          break;

        case 'constellation-node':
          // Branching constellation structure with silver-blue paths
          var ctype = VISUAL_TYPES[n.vtype] || VISUAL_TYPES.constellation;
          ctx.beginPath();
          // Central point
          ctx.arc(x, y, s * 0.32, 0, Math.PI * 2);
          ctx.fillStyle = ctype.colors.primary;
          ctx.fill();
          // Branch lines (3-5 points)
          var branches = 3 + (hash(n.id + 'br') % 3);
          ctx.globalAlpha *= 0.6;
          ctx.strokeStyle = ctype.colors.secondary;
          ctx.lineWidth = 1.1;
          for (var bi = 0; bi < branches; bi++) {
            var ba = n.phase + bi * (Math.PI * 2 / branches);
            var bl = s * (0.7 + hash(n.id + 'bl' + bi) * 0.4);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(ba) * bl, y + Math.sin(ba) * bl);
            ctx.stroke();
            // End node
            ctx.beginPath();
            ctx.arc(x + Math.cos(ba) * bl, y + Math.sin(ba) * bl, s * 0.14, 0, Math.PI * 2);
            ctx.fillStyle = ctype.colors.accent;
            ctx.fill();
          }
          break;

        case 'signal-node':
          // Data tracks and pulse lines - instrument-like
          var stype = VISUAL_TYPES[n.vtype] || VISUAL_TYPES.signal;
          // Central gauge
          ctx.beginPath();
          ctx.arc(x, y, s * 0.42, 0, Math.PI * 2);
          ctx.fillStyle = stype.colors.primary;
          ctx.fill();
          // Scale marks around edge
          ctx.globalAlpha *= 0.55;
          ctx.strokeStyle = stype.colors.accent;
          ctx.lineWidth = 0.9;
          for (var si = 0; si < 8; si++) {
            var sa = n.phase + si * Math.PI / 4;
            var sr = s * 0.58;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(sa) * s * 0.46, y + Math.sin(sa) * s * 0.46);
            ctx.lineTo(x + Math.cos(sa) * sr, y + Math.sin(sa) * sr);
            ctx.stroke();
          }
          // Pulse line through center
          ctx.globalAlpha = Math.min(1, ctx.globalAlpha + 0.1);
          ctx.beginPath();
          ctx.moveTo(x - s * 0.65, y);
          ctx.lineTo(x + s * 0.65, y);
          ctx.strokeStyle = stype.colors.secondary;
          ctx.lineWidth = 1.3;
          ctx.stroke();
          break;

        case 'nebula-core':
          // Soft cloud halo with text particle feel
          var ntype = VISUAL_TYPES[n.vtype] || VISUAL_TYPES.nebula;
          // Outer soft glow
          var grad = ctx.createRadialGradient(x, y, 0, x, y, s * 1.4);
          grad.addColorStop(0, ntype.colors.primary + 'cc');
          grad.addColorStop(0.5, ntype.colors.secondary + '66');
          grad.addColorStop(1, 'transparent');
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, s * 1.4, 0, Math.PI * 2);
          ctx.fill();
          // Core
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(x, y, s * 0.36, 0, Math.PI * 2);
          ctx.fillStyle = ntype.colors.accent;
          ctx.fill();
          // Scattered micro particles
          ctx.globalAlpha *= 0.45;
          for (var pi = 0; pi < 5; pi++) {
            var pa = n.phase + pi * 1.26;
            var pd = s * (0.55 + hash(n.id + 'p' + pi) * 0.5);
            ctx.beginPath();
            ctx.arc(x + Math.cos(pa) * pd, y + Math.sin(pa) * pd, s * 0.08, 0, Math.PI * 2);
            ctx.fillStyle = ntype.colors.primary;
            ctx.fill();
          }
          break;

        case 'fragment-crystal':
          // Irregular crystal with broken geometry
          var ftype = VISUAL_TYPES[n.vtype] || VISUAL_TYPES.fragment;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(n.phase * 0.5);
          // Main crystal body (irregular polygon)
          ctx.beginPath();
          ctx.moveTo(-s * 0.42, -s * 0.68);
          ctx.lineTo(s * 0.28, -s * 0.78);
          ctx.lineTo(s * 0.62, -s * 0.12);
          ctx.lineTo(s * 0.38, s * 0.72);
          ctx.lineTo(-s * 0.18, s * 0.82);
          ctx.lineTo(-s * 0.68, s * 0.22);
          ctx.closePath();
          ctx.fillStyle = ftype.colors.primary;
          ctx.globalAlpha = 0.75;
          ctx.fill();
          // Facet lines
          ctx.globalAlpha *= 0.6;
          ctx.strokeStyle = ftype.colors.accent;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(-s * 0.42, -s * 0.68);
          ctx.lineTo(s * 0.38, s * 0.72);
          ctx.moveTo(s * 0.28, -s * 0.78);
          ctx.lineTo(-s * 0.18, s * 0.82);
          ctx.moveTo(s * 0.62, -s * 0.12);
          ctx.lineTo(-s * 0.68, s * 0.22);
          ctx.stroke();
          // Offset fragment piece
          ctx.globalAlpha *= 0.5;
          ctx.beginPath();
          ctx.moveTo(s * 0.48, -s * 0.42);
          ctx.lineTo(s * 0.82, -s * 0.28);
          ctx.lineTo(s * 0.72, s * 0.18);
          ctx.lineTo(s * 0.42, s * 0.08);
          ctx.closePath();
          ctx.fillStyle = ftype.colors.secondary;
          ctx.fill();
          ctx.restore();
          break;

        // === Original shapes (projects, records, fragments) ===
        case 'core':
          ctx.beginPath();
          ctx.arc(x, y, s * 0.46, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          var arm = s * (strong ? 1.5 : 1.15);
          ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y);
          ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm);
          ctx.globalAlpha *= 0.55;
          ctx.stroke();
          break;
        case 'halo':
          ctx.beginPath();
          ctx.arc(x, y, s * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, s * 0.95, 0, Math.PI * 2);
          ctx.globalAlpha *= 0.5;
          ctx.stroke();
          break;
        case 'cluster':
          ctx.beginPath();
          ctx.arc(x, y, s * 0.36, 0, Math.PI * 2);
          ctx.fill();
          for (var i = 0; i < 3; i++) {
            var a = n.phase + i * 2.09;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * s * 0.85, y + Math.sin(a) * s * 0.85, s * 0.16, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case 'crystal':
          // a cut stone: one bright table facet over a darker body
          ctx.beginPath();
          ctx.moveTo(x, y - s * 0.86);
          ctx.lineTo(x + s * 0.5, y - s * 0.2);
          ctx.lineTo(x + s * 0.3, y + s * 0.8);
          ctx.lineTo(x - s * 0.42, y + s * 0.62);
          ctx.lineTo(x - s * 0.56, y - s * 0.28);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha *= 0.55;
          ctx.beginPath();
          ctx.moveTo(x - s * 0.56, y - s * 0.28);
          ctx.lineTo(x + s * 0.06, y - s * 0.02);
          ctx.lineTo(x + s * 0.5, y - s * 0.2);
          ctx.moveTo(x + s * 0.06, y - s * 0.02);
          ctx.lineTo(x - s * 0.42, y + s * 0.62);
          ctx.stroke();
          break;
        case 'prism':
          ctx.beginPath();
          ctx.moveTo(x - s * 0.52, y - s * 0.5);
          ctx.lineTo(x + s * 0.2, y - s * 0.78);
          ctx.lineTo(x + s * 0.58, y - s * 0.1);
          ctx.lineTo(x + s * 0.16, y + s * 0.82);
          ctx.lineTo(x - s * 0.46, y + s * 0.34);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha *= 0.5;
          ctx.beginPath();
          ctx.moveTo(x - s * 0.52, y - s * 0.5);
          ctx.lineTo(x + s * 0.58, y - s * 0.1);
          ctx.moveTo(x + s * 0.58, y - s * 0.1);
          ctx.lineTo(x - s * 0.46, y + s * 0.34);
          ctx.stroke();
          break;
        case 'hexagon':
          ctx.beginPath();
          for (var k = 0; k < 6; k++) {
            var ang = k * Math.PI / 3 - Math.PI / 6;
            var px = x + Math.cos(ang) * s * 0.62;
            var py = y + Math.sin(ang) * s * 0.62;
            if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          break;
        case 'shard':
          // a torn strip of the archive: long, thin, never round
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(n.phase * 0.6);
          ctx.beginPath();
          ctx.moveTo(-s * 0.16, -s * 0.95);
          ctx.lineTo(s * 0.14, -s * 0.2);
          ctx.lineTo(s * 0.05, s * 0.98);
          ctx.lineTo(-s * 0.2, s * 0.28);
          ctx.closePath();
          ctx.globalAlpha *= 0.72;
          ctx.fill();
          ctx.restore();
          break;
        case 'swarm':
          // a record is a micro cluster, not a dot
          for (var q = 0; q < 4; q++) {
            var sa = n.phase + q * 1.57;
            var sd = s * (q === 0 ? 0 : 0.52 + hash(n.id + 'sp' + q) * 0.4);
            ctx.beginPath();
            ctx.arc(x + Math.cos(sa) * sd, y + Math.sin(sa) * sd * 0.8,
              q === 0 ? s * 0.24 : s * 0.13, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case 'bookmark':
          ctx.beginPath();
          ctx.moveTo(x - s * 0.34, y - s * 0.5);
          ctx.lineTo(x + s * 0.34, y - s * 0.5);
          ctx.lineTo(x + s * 0.34, y + s * 0.5);
          ctx.lineTo(x, y + s * 0.22);
          ctx.lineTo(x - s * 0.34, y + s * 0.5);
          ctx.closePath();
          ctx.fill();
          break;
        default:
          ctx.beginPath();
          ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
          ctx.fill();
      }
      // Champagne, in the smallest possible mark: earned by projects that have
      // more than one published version. Never a fill, never on screen in bulk.
      if (n.key) {
        ctx.globalAlpha = Math.min(1, ctx.globalAlpha + 0.1) * 0.9;
        ctx.strokeStyle = 'rgba(230,207,166,1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.86, y - s * 0.86);
        ctx.lineTo(x + s * 1.3, y - s * 0.86);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    function pick(px, py) {
      if (!graph) return null;
      var best = null, bestScore = -Infinity;
      graph.nodes.forEach(function (n) {
        var reach = Math.max(15, n.r * n.sk * cam.zoom + 8);
        var d = Math.hypot(n.sx - px, n.sy - py);
        if (d > reach) return;
        // prefer the node closest to the camera, then the one closest to cursor
        var score = -n.sz * 40 - d;
        if (score > bestScore) { bestScore = score; best = n; }
      });
      return best;
    }

    function neighbours(node) {
      if (!node || !graph) return [];
      return graph.links
        .filter(function (l) { return l.a === node.id || l.b === node.id; })
        .map(function (l) { return byId[l.a === node.id ? l.b : l.a]; });
    }

    function collides(list, box) {
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (box.x < b.x + b.w && b.x < box.x + box.w &&
            box.y < b.y + b.h && b.y < box.y + box.h) return true;
      }
      return false;
    }

    // Both lenses multiply: a Create-only view inside an entered topic should
    // not light up the Observe side again.
    function veil(n) {
      return Math.min(dimmed(n), inFocus(n));
    }

    function draw(now) {
      if (!graph) return;
      ctx.clearRect(0, 0, w, h);
      project();

      var lit = selected || hover || idle;
      // The opening emphasis is a hint, not a verdict: it draws the same shape
      // a real selection would, at roughly half the weight.
      var soft = !selected && !hover && !!lit;
      var litSet = {};
      neighbours(lit).forEach(function (n) { litSet[n.id] = 1; });
      if (lit) litSet[lit.id] = 1;

      // Painter's order: far shell first so the near nodes sit on top of it.
      var order = graph.nodes.slice().sort(function (a, b) { return b.sz - a.sz; });

      // The back half of the core goes under everything, so nodes and links can
      // cross in front of it the way they would in a real volume.
      drawCoreFar(now);

      // edges first, so nodes read as objects floating in front of them
      graph.links.forEach(function (l) {
        var s = byId[l.a], t = byId[l.b];
        if (!s || !t) return;
        var on = lit && (l.a === lit.id || l.b === lit.id);
        var side = Math.min(veil(s), veil(t));
        var fade = Math.min(depthFade(s), depthFade(t)) * side;
        var breathe = reduced ? 1 : 0.8 + Math.sin(now * 0.0005 + s.phase) * 0.2;
        ctx.beginPath();
        var bow = hash(l.a + l.b) - 0.5;
        if (l.kind === 'co' || l.kind === 'project' || l.kind === 'frag') {
          // soft arcs: topic↔topic co-occurrence and topic→project links
          var amp = l.kind === 'co' ? 0.2 : l.kind === 'frag' ? 0.24 : 0.13;
          var mx = (s.sx + t.sx) / 2 - (t.sx - s.sx) * bow * amp;
          var my = (s.sy + t.sy) / 2 - (t.sy - s.sy) * bow * amp;
          ctx.moveTo(s.sx, s.sy);
          ctx.quadraticCurveTo(mx, my, t.sx, t.sy);
        } else if (Math.abs(bow) > 0.3) {
          // a third of the record links are filaments with a slight drift
          var fx = (s.sx + t.sx) / 2 + (s.sy - t.sy) * bow * 0.28;
          var fy = (s.sy + t.sy) / 2 + (t.sx - s.sx) * bow * 0.28;
          ctx.moveTo(s.sx, s.sy);
          ctx.quadraticCurveTo(fx, fy, t.sx, t.sy);
        } else {
          ctx.moveTo(s.sx, s.sy);
          ctx.lineTo(t.sx, t.sy);
        }
        ctx.lineWidth = on ? (soft ? 0.8 : 1.5) : (l.kind === 'project' ? 0.9 : l.kind === 'co' ? 0.6 : 0.7);
        ctx.setLineDash(l.kind === 'co' && !on ? [3, 6] : []);
        // The opening hint must not trace a hub: kept violet and near the
        // ambient link level, it reads as one star glowing brighter, not as a
        // diagram of what connects to what.
        ctx.strokeStyle = on
          ? (soft
            ? 'rgba(166,108,249,' + (0.15 + fade * 0.10).toFixed(3) + ')'
            : 'rgba(242,156,207,' + (0.7 + fade * 0.25).toFixed(3) + ')')
          : (l.kind === 'co'
            ? 'rgba(89,139,216,' + (0.32 * fade * breathe).toFixed(3) + ')'
            : l.kind === 'project'
              ? 'rgba(217,179,255,' + (0.44 * fade * breathe).toFixed(3) + ')'
              : l.kind === 'frag'
                ? 'rgba(232,177,236,' + (0.26 * fade * breathe).toFixed(3) + ')'
                : 'rgba(143,89,247,' + (0.34 * fade * breathe).toFixed(3) + ')');
        ctx.stroke();
        ctx.setLineDash([]);
      });

      if (pulse) {
        var ps = byId[pulse.a], pt = byId[pulse.b];
        if (ps && pt) {
          var k = (now - pulse.at) / 1100;
          if (k > 1) pulse = null;
          else {
            // Use visual type colors for pulse if source is a topic
            var pulseColor = 'rgba(242,156,207,1)';
            if (ps.kind === 'topic' && ps.vtype && VISUAL_TYPES[ps.vtype]) {
              var pc = VISUAL_TYPES[ps.vtype].colors;
              pulseColor = pc.accent + 'ff';
            } else if (pt.kind === 'topic' && pt.vtype && VISUAL_TYPES[pt.vtype]) {
              var tc = VISUAL_TYPES[pt.vtype].colors;
              pulseColor = tc.accent + 'ff';
            }
            ctx.globalAlpha = 0.9 * Math.min(1, 1.2 - k);
            var gx = ps.sx + (pt.sx - ps.sx) * k, gy = ps.sy + (pt.sy - ps.sy) * k;
            if (sprite.topic) {
              // Draw pulse with type-specific color
              var pSize = 32;
              ctx.save();
              ctx.globalCompositeOperation = 'screen';
              ctx.drawImage(sprite.topic, gx - pSize/2, gy - pSize/2, pSize, pSize);
              ctx.restore();
            }
            ctx.globalAlpha = 1;
          }
        } else pulse = null;
      }

      drawNucleus(now);

      var boxes = [];
      var narrow = w < 720;
      var closeUp = cam.zoom >= LABEL_ZOOM;
      order.forEach(function (n) {
        var fade = depthFade(n);
        var side = veil(n);
        var isLit = lit && n.id === lit.id;
        var isNear = litSet[n.id] && lit && n.id !== lit.id;
        var amp = reduced ? 0 : 1 + Math.sin(now * 0.0009 + n.phase) * 0.12;
        var r = n.r * n.sk * cam.zoom * amp * (isLit ? (soft ? 1.35 : 1.7) : 1);
        var sp = sprite[n.kind] || sprite.post;

        if (sp && side > 0.5) {
          var halo = r * (isLit ? (soft ? 5.6 : 7.5) : n.kind === 'post' ? 4 : n.kind === 'fragment' ? 3.2 : 5.2);
          ctx.globalAlpha = Math.min(1, fade * side * (isLit ? (soft ? 0.6 : 0.92) : n.kind === 'post' ? 0.5 : 0.68));
          ctx.drawImage(sp, n.sx - halo / 2, n.sy - halo / 2, halo, halo);
        }

        // Major topics breathe: a ring that expands and fades on a slow cycle.
        if (n.kind === 'topic' && (n.count || 0) >= 5 && !reduced && side > 0.5) {
          var vtypeCfg = n.vtype && VISUAL_TYPES[n.vtype] ? VISUAL_TYPES[n.vtype] : null;
          var pulseRate = vtypeCfg ? vtypeCfg.motion.pulse : 0.00022;
          var cyc = ((now * pulseRate + n.phase) % 1 + 1) % 1;
          ctx.beginPath();
          ctx.arc(n.sx, n.sy, r * (1.1 + cyc * 2.2), 0, Math.PI * 2);
          var ringColor = vtypeCfg ? vtypeCfg.colors.secondary : 'rgba(144,188,235,1)';
          ctx.strokeStyle = ringColor.replace('1)', (0.3 * (1 - cyc) * fade).toFixed(3) + ')');
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.globalAlpha = Math.min(1, (fade + (isLit ? 0.4 : 0.12)) * side);
        // Use visual type colors for topics, original palette for others
        var nodeColor;
        if (n.kind === 'topic' && n.vtype && VISUAL_TYPES[n.vtype]) {
          var vtc = VISUAL_TYPES[n.vtype].colors;
          nodeColor = isLit || isNear ? INK.core : vtc.primary;
        } else {
          nodeColor = isLit || isNear ? INK.core
            : n.kind === 'topic' ? INK.topic
              : n.kind === 'project' ? INK.project
                : n.kind === 'fragment' ? INK.fragment : INK.post;
        }
        drawBody(n, r, nodeColor, isLit || isNear);
        ctx.globalAlpha = 1;

        /* Topics name the structure. Projects name themselves when they are
           close enough to read. A record is a cluster of light until you
           actually fly into it — that is what makes zooming feel like
           discovery instead of like scaling a flat image. */
        var wantLabel = side > 0.5 && (
          isLit ||
          n.kind === 'topic' ||
          (n.kind === 'project' && (n.sk > 1.02 || closeUp)) ||
          (n.kind === 'post' && (closeUp || entered === n))
        );
        if (wantLabel) {
          var max = isLit ? 26 : n.kind === 'post' ? 18 : narrow ? 9 : 14;
          var text = n.label.length > max ? n.label.slice(0, max - 1) + '…' : n.label;
          var size = isLit ? 13 : 11;
          if (narrow && !isLit && !closeUp) size = 10;
          ctx.font = (isLit ? '600 ' : '') + size + 'px "JetBrains Mono", monospace';
          var tw = ctx.measureText(text).width;
          var box = { x: n.sx - tw / 2 - 4, y: n.sy - r * 0.5 - size - 12, w: tw + 8, h: size + 5 };
          if (!collides(boxes, box) || isLit) {
            boxes.push(box);
            ctx.globalAlpha = Math.max(0.35, fade) * side;
            ctx.fillStyle = isLit ? INK.core
              : n.kind === 'post' ? 'rgba(166,108,249,0.95)' : 'rgba(217,179,255,0.95)';
            ctx.textAlign = 'center';
            ctx.fillText(text, n.sx, n.sy - r * 0.5 - 9);
            ctx.globalAlpha = 1;
          }
        }
      });

      // The front half of the core closes over the field.
      drawCoreNear();

      if (lit) {
        ctx.beginPath();
        ctx.arc(lit.sx, lit.sy, Math.max(14, lit.r * lit.sk * cam.zoom + 6), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(242,156,207,0.55)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    function step(now) {
      var dt = Math.min(48, now - (last || now));
      var u = dt / 1000;
      last = now;
      if (!dragging) {
        cam.tyaw += vel.yaw;
        cam.tpitch += vel.pitch;
        vel.yaw *= 0.94;
        vel.pitch *= 0.94;
        if (Math.abs(vel.yaw) < 0.00004) vel.yaw = 0;
        if (Math.abs(vel.pitch) < 0.00004) vel.pitch = 0;
      }
      if (spinHold && !dragging && now > spinHold) {
        spinHold = 0;
        if (!reduced) { spin = true; syncSpin(); }
      }
      // Base rotation speed, modulated by visual type diversity
      var baseSpin = 0.058;
      if (spin && !dragging) {
        // Add slight variation based on entered topic's visual type
        var typeSpeed = 1;
        if (entered && entered.vtype && VISUAL_TYPES[entered.vtype]) {
          typeSpeed = VISUAL_TYPES[entered.vtype].motion.speed;
        }
        cam.tyaw += baseSpin * u * typeSpeed;
      }
      cam.tpitch = clamp(cam.tpitch, -PITCH_MAX, PITCH_MAX);
      cam.yaw += (cam.tyaw - cam.yaw) * 0.12;
      cam.pitch += (cam.tpitch - cam.pitch) * 0.12;
      cam.zoom += (cam.tzoom - cam.zoom) * 0.12;
      par.x += (par.tx - par.x) * 0.07;
      par.y += (par.ty - par.y) * 0.07;
    }

    function tick(now) {
      if (!running) return;
      step(now);
      draw(now);
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (!graph) return;
      if (reduced) { project(); draw(performance.now()); return; }
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(tick);
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    function drawIfStatic() {
      if (reduced || !running) { project(); draw(performance.now()); }
    }

    /* Bring a node to the front of the volume: solve yaw/pitch that put it on
       the camera axis instead of sliding a flat sheet around. When entering a
       topic the aim is deliberately off-axis, so the node lands to one side and
       the archive core stays in frame behind it. */
    function focus(node, deep) {
      if (!node) return;
      var twoPi = Math.PI * 2;
      var wantYaw = Math.atan2(node.vx, -node.vz);
      var flat = Math.hypot(node.vx, node.vz);
      var wantPitch = clamp(Math.atan2(-node.vy, flat), -PITCH_MAX, PITCH_MAX);
      if (deep) { wantYaw -= 0.3; wantPitch -= 0.2; }
      cam.tyaw = cam.tyaw + (((wantYaw - cam.tyaw) % twoPi + twoPi * 1.5) % twoPi - Math.PI);
      cam.tpitch = clamp(wantPitch, -PITCH_MAX, PITCH_MAX);
      cam.tzoom = Math.max(cam.tzoom, deep ? 2.05 : 1.3);
      vel.yaw = vel.pitch = 0;
      holdSpin(deep ? 26000 : 12000);
    }

    /* Entering is more than a camera move: the rest of the field falls back to
       a whisper and the panel switches to that topic's own development
       timeline. Nothing is removed, so leaving is instant and lossless. */
    function enter(node) {
      if (!node) return;
      entered = node;
      markReachable(node);
      selected = node;
      describe(node);
      focus(node, true);
      root.classList.add('is-entered');
      if (hud) el('[data-cx-inside]', hud).textContent = '已进入：' + node.label + ' · Esc 退出';
      drawIfStatic();
    }

    function exit() {
      if (!entered) return;
      entered = null;
      near = {};
      root.classList.remove('is-entered');
      if (hud) el('[data-cx-inside]', hud).textContent = '';
      reset();
    }

    function reset() {
      cam.tyaw = 0.5; cam.tpitch = -0.2; cam.tzoom = 1;
      vel.yaw = vel.pitch = 0;
      selected = null;
      spinHold = 0;
      spin = !reduced;
      syncSpin();
      showDefault();
      drawIfStatic();
    }

    /* ---------------------------------------------------------------- */
    /* Node description — name, one or two sentences, one way in        */
    /* ---------------------------------------------------------------- */
    function sentence(str, max) {
      var s = String(str || '').replace(/\s+/g, ' ').trim();
      if (s.length <= max) return s;
      var cut = s.slice(0, max);
      var stop = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('.'), cut.lastIndexOf('；'));
      return (stop > max * 0.45 ? cut.slice(0, stop + 1) : cut.trim() + '…');
    }

    /* What belongs to a topic, in the order it actually happened. Every entry
       is a real date from an article, a repository or a published version — the
       timeline is assembled, never written. */
    function topicTimeline(node) {
      var out = [];
      (node.hrefs || []).forEach(function (h) {
        var rec = T.content.find(h);
        if (rec && rec.date) out.push({ date: rec.date, what: rec.title, href: h, kind: '记录' });
      });
      (node.projects || []).forEach(function (slug) {
        var pr = (T.content.projects || []).filter(function (x) {
          return x.slug === slug;
        })[0];
        if (!pr) return;
        var page = '/projects/' + slug + '/';
        if (pr.since) out.push({ date: pr.since, what: pr.name + ' 开始', href: page, kind: '项目' });
        (pr.versions || []).forEach(function (v) {
          if (v.date) out.push({ date: v.date, what: v.ver + ' ' + v.label, href: page, kind: '版本' });
        });
        if (pr.updated && pr.updated !== pr.since) {
          out.push({ date: pr.updated, what: pr.name + ' 最近一次更新', href: page, kind: '项目' });
        }
      });
      out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      var seen = {}, uniq = [];
      out.forEach(function (e) {
        var k = e.date + '|' + e.what;
        if (seen[k]) return;
        seen[k] = 1;
        uniq.push(e);
      });
      return uniq;
    }

    function info(node) {
      var site = (T.content.site || {});
      if (node.kind === 'topic') {
        var notes = site.topicNotes || {};
        var hrefs = node.hrefs || [];
        var projs = node.projects || [];
        var world = WORLD_TAGS[node.label];
        var first = hrefs.length ? T.content.find(hrefs[0]) : null;
        var text = world ? world.line : (notes[node.label] || '');
        
        // Visual type label for the panel
        var vtypeLabel = node.vtype ? 
          (node.vtype === 'orbit' ? 'Orbit · 轨道' :
           node.vtype === 'constellation' ? 'Constellation · 星座' :
           node.vtype === 'signal' ? 'Signal · 信号' :
           node.vtype === 'nebula' ? 'Nebula · 星云' :
           node.vtype === 'fragment' ? 'Fragment · 碎片' : '') : '';
        
        // A topic panel ends with one of the author's own sentences, taken
        // verbatim from an article that actually carries this tag.
        var quote = null;
        if (T.content.fragments) {
          var pool = T.content.fragments();
          for (var i = 0; i < pool.length; i++) {
            if (pool[i].href && hrefs.indexOf(pool[i].href) >= 0) { quote = pool[i]; break; }
          }
        }
        var items = [];
        projs.forEach(function (slug) {
          var pr = (T.content.projects || []).filter(function (x) { return x.slug === slug; })[0];
          items.push({ label: pr ? pr.name : slug, href: '/projects/' + slug + '/', tag: '项目' });
        });
        hrefs.slice(0, 8).forEach(function (h) {
          var rec = T.content.find(h);
          if (rec) items.push({ label: rec.title, href: h, tag: rec.date || '记录' });
        });
        return {
          kind: '主题', cls: 'topic', name: node.label,
          vtype: vtypeLabel,
          text: text,
          meta: hrefs.length + ' 篇记录 · ' + projs.length + ' 个项目',
          items: items,
          timeline: topicTimeline(node),
          quote: quote,
          cta: world
            ? { href: world.href, label: '进入这一侧' }
            : { href: node.href, label: '进入主题' }
        };
      }
      if (node.kind === 'fragment') {
        return {
          kind: '碎片', cls: 'frag', name: node.sourceTitle || '思想碎片',
          text: '',
          meta: [node.date, node.topic].filter(Boolean).join(' · '),
          quote: { text: node.text, href: node.src, title: node.sourceTitle },
          cta: { href: node.src, label: '回到原文' }
        };
      }
      if (node.kind === 'project') {
        var p = (T.content.projects || []).filter(function (x) {
          return '/projects/' + x.slug + '/' === node.id;
        })[0] || {};
        var bits = [p.status, p.visibility === 'private' ? '私有仓库' : p.language, p.updated ? '更新 ' + p.updated : ''].filter(Boolean);
        return {
          kind: '项目', cls: 'project', name: node.label,
          text: sentence(p.tagline || p.background, 150),
          meta: bits.join(' · '),
          cta: { href: node.href, label: '查看项目' }
        };
      }
      var rec = T.content.find(node.id) || {};
      var tags = (rec.tags || []).slice(0, 3).join(' · ');
      return {
        kind: '记录', cls: 'record', name: node.label,
        text: sentence(rec.excerpt || rec.plain, 160),
        meta: [rec.date, rec.minutes ? rec.minutes + ' min' : '', tags].filter(Boolean).join(' · '),
        cta: { href: node.id, label: '打开记录' }
      };
    }

    function mk(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text !== undefined && text !== null) e.textContent = text;
      return e;
    }

    /* The panel is the reading surface for whatever the camera is looking at.
       An entered topic gets its own projects, records and development timeline;
       anything else gets a name, two sentences and one way in. */
    function describe(node) {
      if (!node) return;
      var d = info(node);
      panel.hidden = false;
      panel.innerHTML = '';
      panel.appendChild(mk('span', 'cx-panel-kind is-' + d.cls, d.kind));
      panel.appendChild(mk('h3', 'cx-panel-name', d.name));
      // Show visual type label for topics
      if (d.vtype) {
        var vtypeChip = mk('span', 'cx-panel-vtype', d.vtype);
        panel.appendChild(vtypeChip);
      }
      if (d.text) panel.appendChild(mk('p', 'cx-panel-desc', d.text));
      if (d.meta) panel.appendChild(mk('p', 'cx-panel-meta', d.meta));

      if (d.items && d.items.length) {
        var list = mk('div', 'cx-panel-items');
        d.items.forEach(function (it) {
          var a = mk('a', 'cx-item');
          a.href = it.href;
          a.appendChild(mk('span', 'cx-item-tag', it.tag));
          a.appendChild(mk('span', 'cx-item-label', it.label));
          list.appendChild(a);
        });
        panel.appendChild(list);
      }

      if (d.quote) {
        var q = mk('blockquote', 'cx-panel-quote', d.quote.text);
        var cite = mk('cite');
        var from = mk('a', null, '出自《' + d.quote.title + '》');
        from.href = d.quote.href;
        cite.appendChild(from);
        q.appendChild(cite);
        panel.appendChild(q);
      }

      if (d.timeline && d.timeline.length) {
        panel.appendChild(mk('p', 'cx-panel-sub', '时间线'));
        var tl = mk('ol', 'cx-timeline');
        d.timeline.slice(0, 12).forEach(function (e) {
          var li = mk('li', 'cx-tl-item');
          li.appendChild(mk('time', 'cx-tl-date', e.date));
          li.appendChild(mk('span', 'cx-tl-kind', e.kind));
          var what = mk('a', 'cx-tl-what', e.what);
          what.href = e.href;
          li.appendChild(what);
          tl.appendChild(li);
        });
        if (d.timeline.length > 12) {
          tl.appendChild(mk('li', 'cx-tl-more', '还有 ' + (d.timeline.length - 12) + ' 条'));
        }
        panel.appendChild(tl);
      }

      var go = mk('a', 'cx-panel-go');
      go.href = d.cta.href;
      go.innerHTML = '<span></span><i class="arrow">→</i>';
      go.firstChild.textContent = d.cta.label;
      panel.appendChild(go);

      // A doorway needs a way back out, and double-tap is not reliable on touch.
      if (entered && node.kind === 'topic') {
        var out = mk('button', 'cx-panel-exit', '退出主题');
        out.type = 'button';
        out.addEventListener('click', exit);
        panel.appendChild(out);
      }
    }

    function describeLink(link) {
      var a = byId[link.a], b = byId[link.b];
      if (!a || !b) return;
      var shared = graph.nodes.filter(function (n) {
        return n.kind === 'post' &&
          graph.links.some(function (x) { return (x.a === link.a && x.b === n.id) || (x.b === link.a && x.a === n.id); }) &&
          graph.links.some(function (x) { return (x.a === link.b && x.b === n.id) || (x.b === link.b && x.a === n.id); });
      });
      panel.hidden = false;
      panel.innerHTML = '';
      var chip = document.createElement('span');
      chip.className = 'cx-panel-kind';
      chip.textContent = '关联';
      var name = document.createElement('h3');
      name.className = 'cx-panel-name';
      name.textContent = a.label + ' ↔ ' + b.label;
      var desc = document.createElement('p');
      desc.className = 'cx-panel-desc';
      desc.textContent = shared.length
        ? '共享 ' + shared.length + ' 篇记录。'
        : '有关联，但没有完全相同的记录。';
      panel.appendChild(chip);
      panel.appendChild(name);
      panel.appendChild(desc);
      if (shared.length) {
        var row = document.createElement('div');
        row.className = 'cx-panel-links';
        shared.slice(0, 6).forEach(function (n) {
          var x = document.createElement('a');
          x.className = 'cx-link';
          x.href = n.href;
          x.textContent = n.label;
          row.appendChild(x);
        });
        panel.appendChild(row);
      }
    }

    // Chosen from the data, not hardcoded: whichever real topic carries the
    // most records is the one the field shows first.
    function flagship() {
      if (!graph) return null;
      var best = null;
      graph.nodes.forEach(function (n) {
        if (n.kind !== 'topic') return;
        if (!best || (n.count || 0) > (best.count || 0)) best = n;
      });
      return best;
    }

    function showDefault() {
      if (!graph) return;
      var counts = { topic: 0, project: 0, post: 0, fragment: 0 };
      graph.nodes.forEach(function (n) { counts[n.kind]++; });
      panel.hidden = false;
      panel.innerHTML = '';
      panel.appendChild(mk('span', 'cx-panel-kind', 'Celestial Archive'));
      panel.appendChild(mk('h3', 'cx-panel-name',
        counts.topic + ' 个主题 · ' + counts.project + ' 个项目 · ' + counts.post + ' 篇记录'));
      panel.appendChild(mk('p', 'cx-panel-meta', counts.fragment + ' 片碎片'));

      var go = mk('a', 'cx-panel-go');
      go.href = '/archives/';
      go.innerHTML = '<span>全部记录</span><i class="arrow">→</i>';
      panel.appendChild(go);
    }

    /* ---------------------------------------------------------------- */
    /* Interaction                                                       */
    /* ---------------------------------------------------------------- */
    function local(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function pickLink(px, py) {
      if (!graph) return null;
      var best = null, bestD = 8;
      graph.links.forEach(function (l) {
        var s = byId[l.a], t = byId[l.b];
        if (!s || !t) return;
        var dx = t.sx - s.sx, dy = t.sy - s.sy;
        var len2 = dx * dx + dy * dy || 1;
        var u = Math.max(0, Math.min(1, ((px - s.sx) * dx + (py - s.sy) * dy) / len2));
        var d = Math.hypot(px - (s.sx + dx * u), py - (s.sy + dy * u));
        if (d < bestD) { bestD = d; best = l; }
      });
      return best;
    }

    var spinHold = 0;

    function holdSpin(ms) {
      if (reduced) return;
      spin = false;
      spinHold = performance.now() + ms;
      syncSpin();
    }

    canvas.addEventListener('pointerdown', function (e) {
      var p = local(e);
      pointers[e.pointerId] = { x: p.x, y: p.y };
      if (Object.keys(pointers).length === 2) {
        var ids = Object.keys(pointers);
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: cam.tzoom };
        dragging = null;
        return;
      }
      dragging = { x: p.x, y: p.y, moved: 0, hit: pick(p.x, p.y) };
      canvas.classList.add('is-grabbing');
      canvas.setPointerCapture(e.pointerId);
      vel.yaw = vel.pitch = 0;
      holdSpin(3500);
      if (!running) drawIfStatic();
    });

    canvas.addEventListener('pointermove', function (e) {
      var p = local(e);
      if (pointers[e.pointerId]) pointers[e.pointerId] = { x: p.x, y: p.y };

      if (pinch) {
        var ids = Object.keys(pointers);
        if (ids.length >= 2) {
          var a = pointers[ids[0]], b = pointers[ids[1]];
          var d = Math.hypot(a.x - b.x, a.y - b.y);
          cam.tzoom = Math.max(0.6, Math.min(2.6, pinch.zoom * (d / pinch.dist)));
          if (reduced) { cam.zoom = cam.tzoom; }
          drawIfStatic();
        }
        return;
      }

      if (dragging) {
        var dx = p.x - dragging.x, dy = p.y - dragging.y;
        dragging.moved += Math.abs(dx) + Math.abs(dy);
        var s = 0.0052 / Math.max(0.6, cam.zoom);
        cam.tyaw += dx * s;
        cam.tpitch = clamp(cam.tpitch + dy * s * 0.85, -PITCH_MAX, PITCH_MAX);
        cam.yaw = cam.tyaw;
        cam.pitch = cam.tpitch;
        vel.yaw = dx * s * 0.45;
        vel.pitch = dy * s * 0.35;
        dragging.x = p.x;
        dragging.y = p.y;
        holdSpin(3500);
        drawIfStatic();
        return;
      }

      var n = pick(p.x, p.y);
      if (!reduced) {
        par.tx = (p.x / Math.max(1, w) - 0.5) * Math.min(30, w * 0.028);
        par.ty = (p.y / Math.max(1, h) - 0.5) * Math.min(22, h * 0.035);
        if (!running) { par.x = par.tx; par.y = par.ty; drawIfStatic(); }
      }
      if (n !== hover) {
        hover = n;
        canvas.classList.toggle('is-target', !!n);
        // Spatial feedback: when hovering a topic, show its visual type energy
        if (n && n.kind === 'topic' && n.vtype && VISUAL_TYPES[n.vtype]) {
          var vtc = VISUAL_TYPES[n.vtype].colors;
          // Add subtle glow to canvas border
          canvas.style.boxShadow = '0 0 40px -8px ' + vtc.primary + '66';
        } else {
          canvas.style.boxShadow = '';
        }
        // Hover only narrates when nothing is pinned; clicking pins.
        if (!selected) {
          if (n) describe(n);
          else {
            showDefault();
            canvas.style.boxShadow = '';
          }
        }
        drawIfStatic();
      }
    });

    function release(e) {
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) pinch = null;
      if (dragging) {
        var p = local(e);
        if (dragging.moved < 6) {
          if (dragging.hit) {
            selected = dragging.hit;
            describe(selected);
            focus(selected);
          } else {
            var l = pickLink(p.x, p.y);
            if (l) {
              pulse = { a: l.a, b: l.b, at: performance.now() };
              describeLink(l);
            } else {
              selected = null;
              showDefault();
            }
          }
        }
        dragging = null;
        canvas.classList.remove('is-grabbing');
        drawIfStatic();
      }
    }

    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', function () {
      hover = null;
      par.tx = par.ty = 0;
      canvas.classList.remove('is-target');
      canvas.style.boxShadow = '';
    });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      cam.tzoom = clamp(cam.tzoom * (e.deltaY > 0 ? 0.93 : 1.07), 0.6, 2.6);
      if (reduced) cam.zoom = cam.tzoom;
      holdSpin(3500);
      drawIfStatic();
    }, { passive: false });

    /* Double-click is the doorway. On a topic it enters that orbit: camera
       pushes in, everything else dims, the panel becomes that topic's own
       archive. On anything else it just pulls the node forward. Double-clicking
       empty space, or pressing Escape, gives the whole field back. */
    canvas.addEventListener('dblclick', function (e) {
      if (!graph) return;
      var p = local(e);
      var n = pick(p.x, p.y);
      if (n && n.kind === 'topic') {
        enter(n);
      } else if (n) {
        selected = n;
        describe(n);
        focus(n, true);
        drawIfStatic();
      } else {
        exit();
        cam.tzoom = 1;
        cam.tyaw = 0.5;
        cam.tpitch = -0.2;
        selected = null;
        showDefault();
        holdSpin(12000);
        drawIfStatic();
      }
    });

    var modeBtns = els('[data-cx-mode]', root);

    function paintLens() {
      var lens = el('[data-cx-lens]', root);
      if (!lens) return;
      lens.textContent = mode === 'all' ? '视角：全部'
        : (mode === 'create' ? '视角：Create 一侧' : '视角：Observe 一侧');
    }

    function setMode(next) {
      mode = next;
      modeBtns.forEach(function (b) {
        var on = b.dataset.cxMode === mode;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      paintLens();
      drawIfStatic();
    }

    modeBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.cxMode === 'all' ? 'true' : 'false');
      b.addEventListener('click', function () {
        setMode(b.dataset.cxMode);
        holdSpin(12000);
      });
    });

    canvas.addEventListener('keydown', function (e) {
      if (!graph) return;
      var dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (dirs[e.key]) {
        e.preventDefault();
        var from = selected;
        if (!from) {
          // start from whatever is closest to the camera
          graph.nodes.forEach(function (n) {
            if (!from || n.sz < from.sz) from = n;
          });
        }
        if (!from) return;
        var d = dirs[e.key], best = null, bestCost = Infinity;
        // Nearest node in that direction. Stepping keeps the field still:
        // rotating on every keystroke moves the targets out from under the keys.
        graph.nodes.forEach(function (n) {
          if (n === from) return;
          var vx = n.sx - from.sx, vy = n.sy - from.sy;
          var along = vx * d[0] + vy * d[1];
          if (along < 6) return;
          var side = Math.abs(vx * d[1] - vy * d[0]);
          var cost = along + (side * side) / Math.max(60, along);
          if (cost < bestCost) { bestCost = cost; best = n; }
        });
        if (best) {
          selected = best;
          describe(best);
          holdSpin(12000);
          drawIfStatic();
        }
      } else if (e.key === 'Enter') {
        var target = selected || hover;
        if (target && target.href) location.href = target.href;
      } else if (e.key === 'Escape') {
        if (entered) exit();
        else reset();
      } else if (e.key === '+' || e.key === '=') {
        cam.tzoom = Math.min(2.6, cam.tzoom * 1.15); drawIfStatic();
      } else if (e.key === '-' || e.key === '_') {
        cam.tzoom = Math.max(0.6, cam.tzoom / 1.15); drawIfStatic();
      }
    });

    /* controls -------------------------------------------------------- */
    var spinBtn = el('[data-cx="spin"]', root);

    function syncSpin() {
      if (!spinBtn) return;
      spinBtn.classList.toggle('is-off', !spin);
      spinBtn.setAttribute('aria-pressed', spin ? 'true' : 'false');
    }

    if (spinBtn) {
      spinBtn.setAttribute('aria-pressed', spin ? 'true' : 'false');
      spinBtn.addEventListener('click', function () {
        spin = !spin;
        vel.yaw = vel.pitch = 0;
        syncSpin();
        if (!running) drawIfStatic();
      });
    }

    var zoomIn = el('[data-cx="in"]', root);
    var zoomOut = el('[data-cx="out"]', root);
    var home = el('[data-cx="home"]', root);
    if (zoomIn) zoomIn.addEventListener('click', function () {
      cam.tzoom = Math.min(2.6, cam.tzoom * 1.2); if (reduced) cam.zoom = cam.tzoom; drawIfStatic();
    });
    if (zoomOut) zoomOut.addEventListener('click', function () {
      cam.tzoom = Math.max(0.6, cam.tzoom / 1.2); if (reduced) cam.zoom = cam.tzoom; drawIfStatic();
    });
    if (home) home.addEventListener('click', reset);

    /* The opening emphasis is only an invitation: the moment the visitor takes
       over, anywhere inside the field, it steps out of the way. */
    ['pointerdown', 'pointermove', 'keydown', 'wheel'].forEach(function (evt) {
      root.addEventListener(evt, function () {
        if (!idle) return;
        idle = null;
        drawIfStatic();
      }, true);
    });

    function renderFallback() {
      if (!fallback) return;
      fallback.innerHTML = '';
      graph.nodes.filter(function (n) { return n.kind === 'topic'; })
        .sort(function (a, b) { return (b.count || 0) - (a.count || 0); })
        .forEach(function (n) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'chip';
          b.innerHTML = '<span></span><span class="count"></span>';
          b.firstChild.textContent = n.label;
          b.lastChild.textContent = n.count;
          b.addEventListener('click', function () {
            selected = n;
            describe(n);
            focus(n);
            drawIfStatic();
          });
          fallback.appendChild(b);
        });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) start(); else stop(); });
      }, { rootMargin: '100px' }).observe(root);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    new ResizeObserver(function () { resize(); drawIfStatic(); }).observe(root);

    resize();

    // Wait until the articles are enriched: the shells are made of real tags,
    // so building them from the bare lists would draw a sparser, wrong shape.
    T.content.load()
      .then(function (content) { return (content.settled || Promise.resolve(content)); })
      .then(function (content) {
        graph = build(content);
        byId = {};
        graph.nodes.forEach(function (n) { byId[n.id] = n; });
        renderFallback();
        idle = flagship();
        showDefault();
        syncSpin();
        start();
        if (hud) {
          hud.innerHTML = '<span data-cx-lens></span><span data-cx-inside></span>';
          paintLens();
        }
      });
  }

  window.TANCEConstellation = { mount: mount, build: build };
})();
