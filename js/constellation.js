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

  var SHELL = { topic: 0.5, project: 0.84, post: 1.14 };
  var FOCAL = 2.35;          // in shell units; smaller = stronger perspective
  var GOLDEN = 2.39996323;

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
      add({
        id: 'topic:' + t.tag, kind: 'topic', label: t.tag,
        weight: 1 + (t.hrefs.length + t.projects.length) * 0.6,
        count: t.hrefs.length + t.projects.length,
        world: keys.length > 1 ? 'both' : (keys[0] || 'both'),
        href: (WORLD_TAGS[t.tag] || {}).href || '/archives/#tag-' + encodeURIComponent(t.tag),
        hrefs: t.hrefs, projects: t.projects
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

    topics.forEach(function (n, i) {
      var d = fibDir(i, topics.length);
      var wobble = 0.86 + hash(n.id) * 0.3;
      n.vx = d.x * SHELL.topic * wobble;
      n.vy = d.y * SHELL.topic * wobble;
      n.vz = d.z * SHELL.topic * wobble;
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
      if (n.kind === 'topic') return;
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

    graph.nodes.forEach(function (n) {
      n.phase = hash(n.id) * Math.PI * 2;
      // Node bodies are not interchangeable dots: a topic is a star with a
      // halo or a small cluster, a project is a cut stone, a record is a tick
      // or a bookmark. The kind is fixed by data, the variant by a stable hash.
      var v = hash(n.id + 'shape');
      if (n.kind === 'topic') {
        n.r = 5.4 + Math.min(7, (n.count || 1) * 1.1);
        n.shape = (n.count || 1) >= 5 ? 'core' : v < 0.5 ? 'halo' : 'cluster';
      } else if (n.kind === 'project') {
        n.r = 5.4;
        n.shape = v < 0.34 ? 'diamond' : v < 0.67 ? 'hexagon' : 'capsule';
      } else {
        n.r = 3.2;
        n.shape = v < 0.4 ? 'tick' : v < 0.72 ? 'bookmark' : 'particle';
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Glow sprites — one radial gradient per kind, made once            */
  /* ------------------------------------------------------------------ */
  function sprites() {
    var spec = {
      topic: ['rgba(244,238,255,0.9)', 'rgba(214,170,255,0.26)', 'rgba(157,112,255,0)'],
      project: ['rgba(255,236,251,0.85)', 'rgba(242,168,236,0.22)', 'rgba(242,168,236,0)'],
      post: ['rgba(214,170,255,0.8)', 'rgba(157,112,255,0.18)', 'rgba(124,155,214,0)']
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
    var pointers = {}, dragging = null, pinch = null;
    var raf = null, running = false, last = 0;

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

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
    function project() {
      if (!graph) return;
      var cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
      var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      var u = unit(), sx = spread(), ox = w / 2 + par.x, oy = h / 2 + par.y;
      graph.nodes.forEach(function (n) {
        var x1 = n.vx * cy + n.vz * sy;
        var z1 = -n.vx * sy + n.vz * cy;
        var y2 = n.vy * cp - z1 * sp;
        var z2 = n.vy * sp + z1 * cp;
        var k = FOCAL / Math.max(0.35, FOCAL + z2);
        n.sx = ox + x1 * sx * u * k;
        n.sy = oy + y2 * u * k;
        n.sk = k;
        n.sz = z2;
      });
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
        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(x, y - s * 0.72);
          ctx.lineTo(x + s * 0.52, y);
          ctx.lineTo(x, y + s * 0.72);
          ctx.lineTo(x - s * 0.52, y);
          ctx.closePath();
          ctx.fill();
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
        case 'capsule':
          ctx.beginPath();
          ctx.moveTo(x - s * 0.5, y - s * 0.26);
          ctx.lineTo(x + s * 0.5, y - s * 0.26);
          ctx.arc(x + s * 0.5, y, s * 0.26, -Math.PI / 2, Math.PI / 2);
          ctx.lineTo(x - s * 0.5, y + s * 0.26);
          ctx.arc(x - s * 0.5, y, s * 0.26, Math.PI / 2, -Math.PI / 2);
          ctx.closePath();
          ctx.fill();
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
        case 'tick':
          ctx.beginPath();
          ctx.moveTo(x, y - s * 0.5);
          ctx.lineTo(x, y + s * 0.34);
          ctx.stroke();
          break;
        case 'particle':
          ctx.beginPath();
          ctx.arc(x, y, s * 0.28, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x - s * 0.7, y - s * 0.3);
          ctx.lineTo(x - s * 0.12, y);
          ctx.globalAlpha *= 0.45;
          ctx.stroke();
          break;
        default:
          ctx.beginPath();
          ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
          ctx.fill();
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

    function draw(now) {
      if (!graph) return;
      ctx.clearRect(0, 0, w, h);
      project();

      var lit = selected || hover;
      var litSet = {};
      neighbours(lit).forEach(function (n) { litSet[n.id] = 1; });
      if (lit) litSet[lit.id] = 1;

      // Painter's order: far shell first so the near nodes sit on top of it.
      var order = graph.nodes.slice().sort(function (a, b) { return b.sz - a.sz; });

      // edges first, so nodes read as objects floating in front of them
      graph.links.forEach(function (l) {
        var s = byId[l.a], t = byId[l.b];
        if (!s || !t) return;
        var on = lit && (l.a === lit.id || l.b === lit.id);
        var side = Math.min(dimmed(s), dimmed(t));
        var fade = Math.min(depthFade(s), depthFade(t)) * side;
        var breathe = reduced ? 1 : 0.8 + Math.sin(now * 0.0005 + s.phase) * 0.2;
        ctx.beginPath();
        var bow = hash(l.a + l.b) - 0.5;
        if (l.kind === 'co' || l.kind === 'project') {
          // soft arcs: topic↔topic co-occurrence and topic→project links
          var amp = l.kind === 'co' ? 0.2 : 0.13;
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
        ctx.lineWidth = on ? 1.5 : (l.kind === 'project' ? 0.9 : l.kind === 'co' ? 0.6 : 0.7);
        ctx.setLineDash(l.kind === 'co' && !on ? [3, 6] : []);
        ctx.strokeStyle = on
          ? 'rgba(242,168,236,' + (0.7 + fade * 0.25).toFixed(3) + ')'
          : (l.kind === 'co'
            ? 'rgba(124,155,214,' + (0.3 * fade * breathe).toFixed(3) + ')'
            : l.kind === 'project'
              ? 'rgba(214,170,255,' + (0.44 * fade * breathe).toFixed(3) + ')'
              : 'rgba(157,112,255,' + (0.34 * fade * breathe).toFixed(3) + ')');
        ctx.stroke();
        ctx.setLineDash([]);
      });

      if (pulse) {
        var ps = byId[pulse.a], pt = byId[pulse.b];
        if (ps && pt) {
          var k = (now - pulse.at) / 1100;
          if (k > 1) pulse = null;
          else {
            ctx.globalAlpha = 0.9 * Math.min(1, 1.2 - k);
            var gx = ps.sx + (pt.sx - ps.sx) * k, gy = ps.sy + (pt.sy - ps.sy) * k;
            if (sprite.topic) ctx.drawImage(sprite.topic, gx - 16, gy - 16, 32, 32);
            ctx.globalAlpha = 1;
          }
        } else pulse = null;
      }

      var boxes = [];
      var narrow = w < 720;
      order.forEach(function (n) {
        var fade = depthFade(n);
        var side = dimmed(n);
        var isLit = lit && n.id === lit.id;
        var isNear = litSet[n.id] && lit && n.id !== lit.id;
        var amp = reduced ? 0 : 1 + Math.sin(now * 0.0009 + n.phase) * 0.12;
        var r = n.r * n.sk * cam.zoom * amp * (isLit ? 1.7 : 1);
        var sp = sprite[n.kind] || sprite.post;

        if (sp && side > 0.5) {
          var halo = r * (isLit ? 7.5 : n.kind === 'post' ? 4 : 5.2);
          ctx.globalAlpha = Math.min(1, fade * side * (isLit ? 0.92 : n.kind === 'post' ? 0.5 : 0.68));
          ctx.drawImage(sp, n.sx - halo / 2, n.sy - halo / 2, halo, halo);
        }

        // Major topics breathe: a ring that expands and fades on a slow cycle.
        if (n.kind === 'topic' && (n.count || 0) >= 5 && !reduced && side > 0.5) {
          var cyc = ((now * 0.00022 + n.phase) % 1 + 1) % 1;
          ctx.beginPath();
          ctx.arc(n.sx, n.sy, r * (1.1 + cyc * 2.2), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(126,208,255,' + (0.3 * (1 - cyc) * fade).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.globalAlpha = Math.min(1, (fade + (isLit ? 0.4 : 0.12)) * side);
        drawBody(n, r,
          isLit || isNear ? '#F4EEFF'
            : n.kind === 'topic' ? '#E7D8FF' : n.kind === 'project' ? '#F2A8EC' : '#9D70FF',
          isLit || isNear);
        ctx.globalAlpha = 1;

        // Topics name the structure; projects when they are close enough to
        // read; records only the one you are looking at. Twenty long titles in
        // a rotating sphere is fog, not a map.
        var wantLabel = side > 0.5 && (n.kind === 'topic' || (n.kind === 'project' && n.sk > 1.02) || isLit);
        if (wantLabel && !narrow) {
          var text = n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label;
          var size = isLit ? 13 : 11;
          ctx.font = (isLit ? '600 ' : '') + size + 'px "JetBrains Mono", monospace';
          var tw = ctx.measureText(text).width;
          var box = { x: n.sx - tw / 2 - 4, y: n.sy - r * 0.5 - size - 12, w: tw + 8, h: size + 5 };
          if (!collides(boxes, box) || isLit) {
            boxes.push(box);
            ctx.globalAlpha = Math.max(0.35, fade);
            ctx.fillStyle = isLit ? '#F4EEFF' : 'rgba(214,170,255,0.95)';
            ctx.textAlign = 'center';
            ctx.fillText(text, n.sx, n.sy - r * 0.5 - 9);
            ctx.globalAlpha = 1;
          }
        }
      });

      if (lit) {
        ctx.beginPath();
        ctx.arc(lit.sx, lit.sy, Math.max(14, lit.r * lit.sk * cam.zoom + 6), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(242,168,236,0.55)';
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
      if (spin && !dragging) cam.tyaw += 0.058 * u;
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
       the camera axis instead of sliding a flat sheet around. */
    function focus(node, deep) {
      if (!node) return;
      var twoPi = Math.PI * 2;
      var wantYaw = Math.atan2(node.vx, -node.vz);
      var flat = Math.hypot(node.vx, node.vz);
      var wantPitch = clamp(Math.atan2(-node.vy, flat), -PITCH_MAX, PITCH_MAX);
      cam.tyaw = cam.tyaw + (((wantYaw - cam.tyaw) % twoPi + twoPi * 1.5) % twoPi - Math.PI);
      cam.tpitch = wantPitch;
      cam.tzoom = Math.max(cam.tzoom, deep ? 1.95 : 1.3);
      vel.yaw = vel.pitch = 0;
      holdSpin(deep ? 22000 : 12000);
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

    function info(node) {
      var site = (T.content.site || {});
      if (node.kind === 'topic') {
        var notes = site.topicNotes || {};
        var hrefs = node.hrefs || [];
        var projs = (node.projects || []).length;
        var world = WORLD_TAGS[node.label];
        var first = hrefs.length ? T.content.find(hrefs[0]) : null;
        var text = world ? world.line : (notes[node.label] || (hrefs.length
          ? '站内有 ' + hrefs.length + ' 篇记录带着这个标签' + (first ? '，最近的一篇写于 ' + (first.date || '') + '。' : '。')
          : '这个标签目前只挂在项目上，还没有对应的记录。'));
        // A topic panel ends with one of the author's own sentences, taken
        // verbatim from an article that actually carries this tag.
        var quote = null;
        if (T.content.fragments) {
          var pool = T.content.fragments();
          for (var i = 0; i < pool.length; i++) {
            if (pool[i].href && hrefs.indexOf(pool[i].href) >= 0) { quote = pool[i]; break; }
          }
        }
        return {
          kind: '主题', cls: 'topic', name: node.label,
          text: text,
          meta: hrefs.length + ' 篇记录 · ' + projs + ' 个项目',
          quote: quote,
          cta: world
            ? { href: world.href, label: '进入这一侧' }
            : { href: node.href, label: '进入主题' }
        };
      }
      if (node.kind === 'project') {
        var p = (T.content.projects || []).filter(function (x) {
          return '/projects/' + x.slug + '/' === node.id;
        })[0] || {};
        var bits = [p.status, p.visibility === 'private' ? '私有仓库' : p.language, p.updated ? '更新 ' + p.updated : ''].filter(Boolean);
        return {
          kind: '项目', cls: 'project', name: node.label,
          text: sentence(p.tagline || p.background, 150) || '这个项目还没有写简介。',
          meta: bits.join(' · '),
          cta: { href: node.href, label: '查看项目' }
        };
      }
      var rec = T.content.find(node.id) || {};
      var tags = (rec.tags || []).slice(0, 3).join(' · ');
      return {
        kind: '记录', cls: 'record', name: node.label,
        text: sentence(rec.excerpt || rec.plain, 160) || '这篇还没有摘要，打开就是原文。',
        meta: [rec.date, rec.minutes ? rec.minutes + ' min' : '', tags].filter(Boolean).join(' · '),
        cta: { href: node.id, label: '打开记录' }
      };
    }

    function describe(node) {
      if (!node) return;
      var d = info(node);
      panel.hidden = false;
      panel.innerHTML = '';
      var chip = document.createElement('span');
      chip.className = 'cx-panel-kind is-' + d.cls;
      chip.textContent = d.kind;
      var name = document.createElement('h3');
      name.className = 'cx-panel-name';
      name.textContent = d.name;
      var desc = document.createElement('p');
      desc.className = 'cx-panel-desc';
      desc.textContent = d.text;
      panel.appendChild(chip);
      panel.appendChild(name);
      panel.appendChild(desc);
      if (d.meta) {
        var meta = document.createElement('p');
        meta.className = 'cx-panel-meta';
        meta.textContent = d.meta;
        panel.appendChild(meta);
      }
      if (d.quote) {
        var q = document.createElement('blockquote');
        q.className = 'cx-panel-quote';
        q.textContent = d.quote.text;
        var who = document.createElement('cite');
        var link = document.createElement('a');
        link.href = d.quote.href;
        link.textContent = '出自《' + d.quote.title + '》';
        who.appendChild(link);
        q.appendChild(who);
        panel.appendChild(q);
      }
      var go = document.createElement('a');
      go.className = 'cx-panel-go';
      go.href = d.cta.href;
      go.innerHTML = '<span></span><i class="arrow">→</i>';
      go.firstChild.textContent = d.cta.label;
      panel.appendChild(go);
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
        ? '这两个主题共享 ' + shared.length + ' 篇记录，连线不是画上去的，是同一批文章同时带着它们。'
        : '这两个主题在站内有关联，但没有完全相同的文章。';
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

    function showDefault() {
      if (!graph) return;
      var counts = { topic: 0, project: 0, post: 0 };
      graph.nodes.forEach(function (n) { counts[n.kind]++; });
      panel.hidden = false;
      panel.innerHTML = '';
      var chip = document.createElement('span');
      chip.className = 'cx-panel-kind';
      chip.textContent = 'Star Field';
      var name = document.createElement('h3');
      name.className = 'cx-panel-name';
      name.textContent = '这一团是我自己的内容结构';
      var desc = document.createElement('p');
      desc.className = 'cx-panel-desc';
      desc.textContent = '主题在内圈，项目在中层，记录挂在自己对应的主题外面。'
        + '拖动可以旋转，滚轮或双指缩放，点任意一个节点看它是什么。';
      var meta = document.createElement('p');
      meta.className = 'cx-panel-meta';
      meta.textContent = counts.topic + ' 个主题 · ' + counts.project + ' 个项目 · ' +
        counts.post + ' 篇记录 · ' + graph.links.length + ' 条真实关联';
      panel.appendChild(chip);
      panel.appendChild(name);
      panel.appendChild(desc);
      panel.appendChild(meta);
      var go = document.createElement('a');
      go.className = 'cx-panel-go';
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
        // Hover only narrates when nothing is pinned; clicking pins.
        if (!selected) {
          if (n) describe(n);
          else showDefault();
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
    });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      cam.tzoom = clamp(cam.tzoom * (e.deltaY > 0 ? 0.93 : 1.07), 0.6, 2.6);
      if (reduced) cam.zoom = cam.tzoom;
      holdSpin(3500);
      drawIfStatic();
    }, { passive: false });

    /* Double-click pulls a node to the front of the volume and holds it there;
       double-clicking empty space gives the whole field back. */
    canvas.addEventListener('dblclick', function (e) {
      if (!graph) return;
      var p = local(e);
      var n = pick(p.x, p.y);
      if (n) {
        selected = n;
        describe(n);
        focus(n, true);
      } else {
        cam.tzoom = 1;
        cam.tyaw = 0.5;
        cam.tpitch = -0.2;
        selected = null;
        showDefault();
        holdSpin(12000);
      }
      drawIfStatic();
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
      if (hud) hud.dataset.mode = mode;
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
        reset();
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
        showDefault();
        syncSpin();
        start();
        if (hud) {
          hud.innerHTML = '<span>节点 <b></b> · 连线 <b></b></span>' +
            '<span>拖动旋转 · 滚轮或双指缩放 · 单击选中 · 双击聚焦</span>' +
            '<span data-cx-lens></span>';
          var b = hud.querySelectorAll('b');
          b[0].textContent = graph.nodes.length;
          b[1].textContent = graph.links.length;
          paintLens();
        }
      });
  }

  window.TANCEConstellation = { mount: mount, build: build };
})();
