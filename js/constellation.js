/* ==========================================================================
   TANCE · NEURAL CONSTELLATION
   A star map of this site's own content: every topic node is a tag or
   category that real articles and projects carry, every edge is a real
   co-occurrence. It is a "thoughts and works" graph — not a claim about
   model weights.
   ========================================================================== */
(function () {
  'use strict';

  function el(sel, root) { return (root || document).querySelector(sel); }

  var PALETTE = {
    topic: { fill: '#D6AAFF', glow: 'rgba(214,170,255,0.85)' },
    post: { fill: '#9D70FF', glow: 'rgba(157,112,255,0.7)' },
    project: { fill: '#F2A8EC', glow: 'rgba(242,168,236,0.7)' }
  };

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
        href: p.href, date: p.date, meta: p.category || (p.section === 'create' ? 'Create' : 'Observe')
      });
    });

    (content.projects || []).forEach(function (pr) {
      add({
        id: '/projects/' + pr.slug + '/', kind: 'project', label: pr.name, weight: 2,
        href: '/projects/' + pr.slug + '/', meta: pr.status || 'project'
      });
    });

    var tagMap = content.tagMap();
    var topics = Object.keys(tagMap)
      .map(function (k) { return { tag: k, hrefs: tagMap[k].hrefs || [], projects: tagMap[k].projects || [] }; })
      .filter(function (t) { return (t.hrefs.length + t.projects.length) >= 1; })
      .sort(function (a, b) { return (b.hrefs.length + b.projects.length) - (a.hrefs.length + a.projects.length); })
      .slice(0, 26);

    topics.forEach(function (t) {
      add({
        id: 'topic:' + t.tag, kind: 'topic', label: t.tag,
        weight: 1 + (t.hrefs.length + t.projects.length) * 0.6,
        count: t.hrefs.length + t.projects.length,
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

    // Co-occurrence between topics that share at least two articles.
    for (var i = 0; i < topics.length; i++) {
      for (var j = i + 1; j < topics.length; j++) {
        var A = topics[i].hrefs, B = topics[j].hrefs;
        if (!A.length || !B.length) continue;
        var shared = A.filter(function (h) { return B.indexOf(h) !== -1; }).length;
        if (shared >= 2) link('topic:' + topics[i].tag, 'topic:' + topics[j].tag, shared, 'co');
      }
    }

    return { nodes: nodes, links: links };
  }

  // Deterministic first layout, then a few relaxation passes so the shape
  // comes from the data rather than from Math.random(). The simulation runs
  // once in a nominal box; resizing only re-maps the result, because re-running
  // 170 passes of an O(n²) solver on every ResizeObserver tick was measurable
  // forced layout.
  var SIM_W = 1000, SIM_H = 600;

  function layout(graph, w, h) {
    if (!graph.sim) simulate(graph);

    var b = graph.bounds, pad = 46;
    var sx = (w - pad * 2) / Math.max(1, b.maxX - b.minX);
    var sy = (h - pad * 2) / Math.max(1, b.maxY - b.minY);
    var s = Math.min(sx, sy, 1.35);
    graph.nodes.forEach(function (n) {
      n.x = pad + (n.x0 - b.minX) * s + (w - pad * 2 - (b.maxX - b.minX) * s) / 2;
      n.y = pad + (n.y0 - b.minY) * s + (h - pad * 2 - (b.maxY - b.minY) * s) / 2;
      n.phase = (n.id.length * 12.9898) % (Math.PI * 2);
      n.r = n.kind === 'topic' ? 4 + Math.min(9, (n.count || 1) * 1.5) : n.kind === 'project' ? 6 : 3.2;
    });
  }

  function simulate(graph) {
    var w = SIM_W, h = SIM_H;
    var topics = graph.nodes.filter(function (n) { return n.kind === 'topic'; });
    var posts = graph.nodes.filter(function (n) { return n.kind === 'post'; });
    var projects = graph.nodes.filter(function (n) { return n.kind === 'project'; });

    topics.forEach(function (n, i) {
      var a = (i / Math.max(1, topics.length)) * Math.PI * 2 - Math.PI / 2;
      var r = Math.min(w, h) * 0.30 * (1 - Math.min(0.45, n.count * 0.03));
      n.x = w / 2 + Math.cos(a) * r * 1.15;
      n.y = h / 2 + Math.sin(a) * r;
    });

    projects.forEach(function (n, i) {
      var a = (i / Math.max(1, projects.length)) * Math.PI * 2 + Math.PI / 7;
      n.x = w / 2 + Math.cos(a) * Math.min(w, h) * 0.44;
      n.y = h / 2 + Math.sin(a) * Math.min(w, h) * 0.30;
    });

    var byId = {};
    graph.nodes.forEach(function (n) { byId[n.id] = n; });

    posts.forEach(function (n) {
      var home = graph.links.filter(function (l) { return l.b === n.id || l.a === n.id; })
        .map(function (l) { return byId[l.a === n.id ? l.b : l.a]; })
        .filter(function (m) { return m && m.kind === 'topic'; })[0];
      if (home) {
        n.x = home.x + Math.cos(n.id.length) * 62;
        n.y = home.y + Math.sin(n.id.length * 1.7) * 52;
      } else {
        n.x = w * 0.5 + Math.cos(n.id.length) * 200;
        n.y = h * 0.5 + Math.sin(n.id.length) * 150;
      }
    });

    for (var pass = 0; pass < 170; pass++) {
      for (var a1 = 0; a1 < graph.nodes.length; a1++) {
        for (var b1 = a1 + 1; b1 < graph.nodes.length; b1++) {
          var na = graph.nodes[a1], nb = graph.nodes[b1];
          var dx = nb.x - na.x, dy = nb.y - na.y;
          var d2 = dx * dx + dy * dy || 0.01;
          if (d2 < 38000) {
            var f = (38000 - d2) / 38000 * 1.7;
            var d = Math.sqrt(d2);
            na.x -= (dx / d) * f; na.y -= (dy / d) * f;
            nb.x += (dx / d) * f; nb.y += (dy / d) * f;
          }
        }
      }
      graph.links.forEach(function (l) {
        var s = byId[l.a], t = byId[l.b];
        var ddx = t.x - s.x, ddy = t.y - s.y;
        var dd = Math.hypot(ddx, ddy) || 1;
        var target = l.kind === 'tag' ? 108 : l.kind === 'co' ? 150 : 190;
        var pull = (dd - target) / dd * 0.045;
        s.x += ddx * pull; s.y += ddy * pull;
        t.x -= ddx * pull; t.y -= ddy * pull;
      });
      graph.nodes.forEach(function (n) {
        n.x += (w / 2 - n.x) * 0.006;
        n.y += (h / 2 - n.y) * 0.011;
      });
    }

    // Freeze the simulated coordinates; layout() maps them into whatever box
    // the canvas currently has.
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    graph.nodes.forEach(function (n) {
      n.x0 = n.x;
      n.y0 = n.y;
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    });
    graph.bounds = { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
    graph.sim = true;
  }

  function mount(root) {
    var canvas = el('#cx-canvas', root);
    var panel = el('.cx-panel', root);
    var fallback = el('.cx-fallback', root);
    var hud = el('.cx-hud', root);
    if (!canvas || !window.TANCE) return;

    var ctx = canvas.getContext('2d');
    var T = window.TANCE;
    var reduced = T.reduced;
    var graph = null;
    var cam = { x: 0, y: 0, scale: 1, tx: 0, ty: 0, tscale: 1 };
    var w = 0, h = 0, dpr = 1;
    var hover = null, selected = null, pulse = null;
    var drag = null;
    var raf = null, running = false;
    var byId = {};

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (graph) layout(graph, w, h);
    }

    function toWorld(px, py) {
      return { x: (px - w / 2) / cam.scale + w / 2 - cam.x, y: (py - h / 2) / cam.scale + h / 2 - cam.y };
    }

    function pick(px, py) {
      if (!graph) return null;
      var p = toWorld(px, py);
      var best = null, bestD = Infinity;
      graph.nodes.forEach(function (n) {
        var d = Math.hypot(n.x - p.x, n.y - p.y);
        if (d < Math.max(14, n.r * cam.scale + 10) && d < bestD) { best = n; bestD = d; }
      });
      return best;
    }

    function pickLink(px, py) {
      if (!graph) return null;
      var p = toWorld(px, py);
      var best = null, bestD = 9;
      graph.links.forEach(function (l) {
        var s = byId[l.a], t = byId[l.b];
        var dx = t.x - s.x, dy = t.y - s.y;
        var len2 = dx * dx + dy * dy || 1;
        var u = Math.max(0, Math.min(1, ((p.x - s.x) * dx + (p.y - s.y) * dy) / len2));
        var cx = s.x + dx * u, cy = s.y + dy * u;
        var d = Math.hypot(p.x - cx, p.y - cy);
        if (d < bestD) { bestD = d; best = l; }
      });
      return best;
    }

    function neighbours(node) {
      if (!node) return [];
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

    function draw() {
      if (!graph) return;
      var boxes = [];
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(cam.scale, cam.scale);
      ctx.translate(-w / 2 + cam.x, -h / 2 + cam.y);

      var now = performance.now();
      var lit = selected || hover;
      var litSet = {};
      neighbours(lit).forEach(function (n) { litSet[n.id] = 1; });
      if (lit) litSet[lit.id] = 1;

      graph.links.forEach(function (l) {
        var s = byId[l.a], t = byId[l.b];
        var on = lit && (l.a === lit.id || l.b === lit.id);
        var breathe = reduced ? 1 : 0.75 + Math.sin(now * 0.0007 + (s.phase || 0)) * 0.25;
        ctx.beginPath();
        if (l.kind === 'co') {
          var mx = (s.x + t.x) / 2 + Math.sin((s.x + t.y) * 0.01) * 22;
          var my = (s.y + t.y) / 2 + Math.cos((t.x + s.y) * 0.01) * 22;
          ctx.moveTo(s.x, s.y);
          ctx.quadraticCurveTo(mx, my, t.x, t.y);
        } else {
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
        }
        ctx.lineWidth = on ? 1.6 : (l.kind === 'project' ? 1.1 : 0.7);
        ctx.strokeStyle = on
          ? 'rgba(242,168,236,0.85)'
          : (l.kind === 'co' ? 'rgba(157,112,255,' + (0.16 * breathe).toFixed(3) + ')'
                             : 'rgba(214,170,255,' + (0.22 * breathe).toFixed(3) + ')');
        ctx.stroke();
      });

      if (pulse) {
        var sN = byId[pulse.a], tN = byId[pulse.b];
        if (sN && tN) {
          var k = (now - pulse.at) / 900;
          if (k > 1) { pulse = null; }
          else {
            var px = sN.x + (tN.x - sN.x) * k, py = sN.y + (tN.y - sN.y) * k;
            var g = ctx.createRadialGradient(px, py, 0, px, py, 22);
            g.addColorStop(0, 'rgba(244,238,255,0.95)');
            g.addColorStop(1, 'rgba(242,168,236,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(px, py, 22, 0, Math.PI * 2);
            ctx.fill();
          }
        } else { pulse = null; }
      }

      graph.nodes.forEach(function (n) {
        var pal = PALETTE[n.kind];
        var isLit = lit && n.id === lit.id;
        var isNear = litSet[n.id] && lit && n.id !== lit.id;
        var amp = reduced ? 0 : Math.sin(now * 0.0011 + (n.phase || 0)) * 0.22;
        var r = n.r * (1 + amp) * (isLit ? 1.5 : 1);

        var halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * (isLit ? 7 : 4.2));
        halo.addColorStop(0, pal.glow);
        halo.addColorStop(1, 'rgba(10,7,20,0)');
        ctx.globalAlpha = isLit ? 0.95 : (n.kind === 'topic' ? 0.5 : 0.34);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * (isLit ? 7 : 4.2), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isLit || isNear ? '#F4EEFF' : pal.fill;
        ctx.fill();

        // Labels: topics and projects name the structure; article titles only
        // appear for the node you are actually looking at. Twenty long Chinese
        // titles in a circle is a wall of text, not a star map.
        var wantLabel = n.kind === 'topic' || n.kind === 'project' || isLit;
        if (wantLabel) {
          var full = n.label;
          var text = full.length > 18 ? full.slice(0, 17) + '…' : full;
          var size = isLit ? 13 : 11;
          ctx.font = (isLit ? '600 ' : '') + size + 'px "JetBrains Mono", monospace';
          var tw = ctx.measureText(text).width;
          var box = { x: n.x - tw / 2 - 4, y: n.y - r - size - 8, w: tw + 8, h: size + 5 };
          if (!collides(boxes, box)) {
            boxes.push(box);
            ctx.fillStyle = isLit ? '#F4EEFF' : 'rgba(214,170,255,0.92)';
            ctx.textAlign = 'center';
            ctx.fillText(text, n.x, n.y - r - 9);
          } else if (isLit) {
            // The node under the cursor always gets its name, even if it overlaps.
            ctx.fillStyle = '#F4EEFF';
            ctx.textAlign = 'center';
            ctx.fillText(text, n.x, n.y - r - 9);
          }
        }
      });

      ctx.restore();

      if (running && !reduced) raf = requestAnimationFrame(draw);
    }

    function loop() {
      cam.x += (cam.tx - cam.x) * 0.12;
      cam.y += (cam.ty - cam.y) * 0.12;
      cam.scale += (cam.tscale - cam.scale) * 0.12;
    }

    function start() {
      if (running || !graph) return;
      running = true;
      (function tick() {
        if (!running) return;
        loop();
        if (reduced) { draw(); running = false; return; }
        draw();
        raf = requestAnimationFrame(tick);
      })();
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    function focus(node) {
      if (!node) return;
      cam.tx = w / 2 - node.x;
      cam.ty = h / 2 - node.y;
      cam.tscale = Math.max(cam.tscale, 1.25);
    }

    function reset() {
      cam.tx = 0; cam.ty = 0; cam.tscale = 1;
      selected = null;
      showDefault();
    }

    function describe(node) {
      if (!node) return;
      var links = [];
      if (node.kind === 'topic') {
        (node.hrefs || []).slice(0, 6).forEach(function (h) {
          var r = T.content.find(h);
          if (r) links.push({ href: r.href, text: r.title, kind: '记录' });
        });
        (node.projects || []).slice(0, 4).forEach(function (s) {
          var p = (T.content.projects || []).filter(function (x) { return x.slug === s; })[0];
          if (p) links.push({ href: '/projects/' + p.slug + '/', text: p.name, kind: '项目' });
        });
      } else if (node.kind === 'post') {
        var r2 = T.content.find(node.id);
        links.push({ href: node.id, text: '打开这篇文章', kind: '文章' });
        neighbours(node).forEach(function (m) {
          if (m.kind === 'topic') links.push({ href: '/archives/#tag-' + encodeURIComponent(m.label), text: m.label, kind: '主题' });
        });
      } else {
        links.push({ href: node.href, text: '项目详情', kind: '项目' });
        neighbours(node).forEach(function (m) {
          if (m.kind === 'topic') links.push({ href: '/archives/#tag-' + encodeURIComponent(m.label), text: m.label, kind: '主题' });
        });
        (T.content.find || null);
      }

      var curated = (T.content.site && T.content.site.topicNotes && T.content.site.topicNotes[node.label]) || '';
      var counts = node.kind === 'topic'
        ? ((node.hrefs || []).length + ' 篇记录 · ' + (node.projects || []).length + ' 个项目')
        : node.meta || '';

      panel.hidden = false;
      panel.innerHTML = '';
      var name = document.createElement('h3');
      name.className = 'cx-panel-name';
      name.textContent = node.label;
      var desc = document.createElement('p');
      desc.className = 'cx-panel-desc';
      desc.textContent = (curated ? curated + ' — ' : '') + counts;
      var row = document.createElement('div');
      row.className = 'cx-panel-links';
      links.slice(0, 9).forEach(function (l) {
        var a = document.createElement('a');
        a.className = 'cx-link';
        a.href = l.href;
        a.innerHTML = '<span class="kind"></span><span></span>';
        a.firstChild.textContent = l.kind;
        a.lastChild.textContent = l.text;
        row.appendChild(a);
      });
      if (!links.length) {
        var none = document.createElement('span');
        none.className = 'cx-link';
        none.textContent = '暂无关联内容';
        row.appendChild(none);
      }
      panel.appendChild(name);
      panel.appendChild(desc);
      panel.appendChild(row);
    }

    function showDefault() {
      panel.hidden = false;
      var topics = graph.nodes.filter(function (n) { return n.kind === 'topic'; }).length;
      panel.innerHTML =
        '<h3 class="cx-panel-name">Neural Constellation</h3>' +
        '<p class="cx-panel-desc">思维星图：' + topics + ' 个主题节点、' +
        graph.nodes.filter(function (n) { return n.kind === 'post'; }).length + ' 篇记录与 ' +
        graph.nodes.filter(function (n) { return n.kind === 'project'; }).length +
        ' 个项目由站内真实标签与分类自动聚合。悬停看关联，点击看内容。</p>';
    }

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
            focus(n);
            describe(n);
            if (reduced) draw();
          });
          fallback.appendChild(b);
        });
    }

    // pointer -------------------------------------------------------------
    canvas.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var px = e.clientX - rect.left, py = e.clientY - rect.top;
      if (drag) {
        cam.tx += (e.clientX - drag.x) / cam.scale;
        cam.ty += (e.clientY - drag.y) / cam.scale;
        cam.x += (e.clientX - drag.x) / cam.scale;
        cam.y += (e.clientY - drag.y) / cam.scale;
        drag.x = e.clientX; drag.y = e.clientY;
        return;
      }
      var n = pick(px, py);
      if (n !== hover) {
        hover = n;
        canvas.style.cursor = n ? 'pointer' : 'grab';
        if (!selected && n) describe(n); else if (!selected && !n) showDefault();
        if (reduced) draw();
      }
    });

    canvas.addEventListener('pointerdown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var n = pick(e.clientX - rect.left, e.clientY - rect.top);
      if (n) {
        selected = n;
        focus(n);
        describe(n);
      } else {
        drag = { x: e.clientX, y: e.clientY };
        canvas.classList.add('is-grabbing');
        canvas.setPointerCapture(e.pointerId);
      }
      if (reduced) draw();
    });

    canvas.addEventListener('pointerup', function (e) {
      if (drag) {
        var moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
        var rect = canvas.getBoundingClientRect();
        if (moved < 4) {
          var l = pickLink(e.clientX - rect.left, e.clientY - rect.top);
          if (l) {
            pulse = { a: l.a, b: l.b, at: performance.now() };
            var shared = graph.nodes.filter(function (n) {
              return n.kind === 'post' &&
                graph.links.some(function (x) { return (x.a === l.a && x.b === n.id) || (x.b === l.a && x.a === n.id); }) &&
                graph.links.some(function (x) { return (x.a === l.b && x.b === n.id) || (x.b === l.b && x.a === n.id); });
            });
            panel.hidden = false;
            panel.innerHTML = '<h3 class="cx-panel-name">' + byId[l.a].label + ' ↔ ' + byId[l.b].label + '</h3>';
            var d = document.createElement('p');
            d.className = 'cx-panel-desc';
            d.textContent = shared.length
              ? '这两个主题共享 ' + shared.length + ' 篇记录：'
              : '这两个主题在站内存在关联，但没有完全相同的文章。';
            panel.appendChild(d);
            var row = document.createElement('div');
            row.className = 'cx-panel-links';
            shared.slice(0, 6).forEach(function (n) {
              var a = document.createElement('a');
              a.className = 'cx-link';
              a.href = n.href;
              a.textContent = n.label;
              row.appendChild(a);
            });
            panel.appendChild(row);
          } else if (selected) {
            selected = null;
            showDefault();
          }
        }
        drag = null;
        canvas.classList.remove('is-grabbing');
      }
    });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var next = Math.min(2.4, Math.max(0.55, cam.tscale * (e.deltaY > 0 ? 0.92 : 1.08)));
      cam.tscale = next;
      if (reduced) { cam.scale = next; draw(); }
    }, { passive: false });

    canvas.addEventListener('pointerleave', function () { hover = null; });

    canvas.addEventListener('keydown', function (e) {
      if (!graph) return;
      var dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (dirs[e.key]) {
        e.preventDefault();
        var from = selected || graph.nodes[0];
        if (!from) return;
        var d = dirs[e.key];
        var best = null, bestScore = -Infinity;
        graph.nodes.forEach(function (n) {
          if (n === from) return;
          var vx = n.x - from.x, vy = n.y - from.y;
          var along = vx * d[0] + vy * d[1];
          if (along <= 0) return;
          var side = Math.abs(vx * d[1] - vy * d[0]);
          var score = along - side * 1.6;
          if (score > bestScore) { bestScore = score; best = n; }
        });
        if (best) { selected = best; focus(best); describe(best); if (reduced) draw(); }
      } else if (e.key === 'Enter' && selected) {
        if (selected.href) location.href = selected.href;
      } else if (e.key === 'Escape') {
        reset();
      }
    });

    // controls ------------------------------------------------------------
    var zoomIn = el('[data-cx="in"]', root);
    var zoomOut = el('[data-cx="out"]', root);
    var home = el('[data-cx="home"]', root);
    if (zoomIn) zoomIn.addEventListener('click', function () { cam.tscale = Math.min(2.4, cam.tscale * 1.2); if (reduced) { cam.scale = cam.tscale; draw(); } });
    if (zoomOut) zoomOut.addEventListener('click', function () { cam.tscale = Math.max(0.55, cam.tscale / 1.2); if (reduced) { cam.scale = cam.tscale; draw(); } });
    if (home) home.addEventListener('click', reset);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) start(); else stop(); });
      }, { rootMargin: '100px' }).observe(root);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    new ResizeObserver(function () { resize(); if (graph && reduced) draw(); if (graph) { stop(); start(); } }).observe(root);

    resize();

    // Wait until the articles are enriched: the graph is made of real tags,
    // so building it from the bare lists would draw a sparser, wrong shape.
    T.content.load()
      .then(function (content) { return (content.settled || Promise.resolve(content)); })
      .then(function (content) {
        graph = build(content);
        byId = {};
        graph.nodes.forEach(function (n) { byId[n.id] = n; });
        layout(graph, w, h);
        renderFallback();
        showDefault();
        start();
        if (hud) {
          hud.innerHTML = '<span>节点 <b></b></span><span>连线 <b></b></span><span>拖动平移 · 滚轮缩放 · 方向键换节点</span>';
          var b = hud.querySelectorAll('b');
          b[0].textContent = graph.nodes.length;
          b[1].textContent = graph.links.length;
        }
      });
  }

  window.TANCEConstellation = { mount: mount, build: build };
})();
