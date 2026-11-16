/* ==========================================================================
   TANCE · NEURAL ORBIT — universe layer
   Turns the runtime content index into the homepage sections and the
   derived pages. Nothing here is hand-maintained per article: a new post
   lands in create.html or observe.html and every section re-derives itself.
   ========================================================================== */
(function () {
  'use strict';

  var T = window.TANCE;
  if (!T) return;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function hueOf(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return 250 + (h % 70) - 20; // keep inside the violet→pink band
  }

  function ymd(date) { return date || '—'; }

  function since(iso) {
    if (!iso) return '';
    var then = new Date(iso + 'T00:00:00');
    if (isNaN(then)) return '';
    var days = Math.round((Date.now() - then.getTime()) / 86400000);
    if (days <= 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 30) return days + ' 天前';
    if (days < 365) return Math.round(days / 30) + ' 个月前';
    return Math.round(days / 365) + ' 年前';
  }

  // Sections re-render as article data arrives. The entrance animation should
  // only play on the very first pass, otherwise content flickers back to zero.
  var firstPass = {};
  function animateOnce(key) {
    if (firstPass[key]) return '';
    firstPass[key] = 1;
    return ' reveal';
  }

  /* ------------------------------------------------------------------ */
  /* HERO                                                                */
  /* ------------------------------------------------------------------ */
  function initHero() {
    var word = $('.hero-word');
    if (word && !T.reduced) {
      var text = word.textContent.trim();
      word.textContent = '';
      text.split('').forEach(function (ch, i) {
        var s = make('span', 'glyph', ch);
        s.style.animationDelay = (i * 90) + 'ms';
        word.appendChild(s);
      });
    }

    var cv = $('#hero-canvas');
    if (cv && T.cosmos) {
      T.engine(T.cosmos(cv, {
        fit: true,
        density: T.small ? 0.00008 : 0.00016,
        minNodes: T.small ? 20 : 46,
        lite: false
      }));
    }

    var end = $('.endmark-canvas');
    if (end && T.cosmos) {
      var eng = T.cosmos(end, { fit: true, density: 0.00006, minNodes: 12, pointer: false });
      if (eng) T.engine(eng);
    }

    // One compositor for the hero: L3 scroll recession + L2 mouse parallax.
    // Both write the same transform, so they must not live in two handlers.
    var stack = $('.hero-stack');
    if (stack) {
      var scrollP = 0, nx = 0, ny = 0, pending = false;

      function compose() {
        pending = false;
        if (T.reduced) {
          stack.style.transform = 'none';
          stack.style.opacity = '1';
          return;
        }
        var y = -scrollP * 44 + ny * 10;
        var x = nx * 14;
        stack.style.transform =
          'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + (1 - scrollP * 0.08).toFixed(4) + ')';
        stack.style.opacity = (1 - scrollP * 0.8).toFixed(3);
      }

      function schedule() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(compose);
      }

      function readScroll() {
        scrollP = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)));
        schedule();
      }

      window.addEventListener('scroll', readScroll, { passive: true });
      if (!T.reduced) {
        window.addEventListener('pointermove', function (e) {
          if (window.scrollY > window.innerHeight) return;
          nx = e.clientX / window.innerWidth - 0.5;
          ny = e.clientY / window.innerHeight - 0.5;
          schedule();
        }, { passive: true });
      }
      readScroll();
    }
  }

  /* ------------------------------------------------------------------ */
  /* WORLD canvases + counts                                             */
  /* ------------------------------------------------------------------ */
  function initWorlds() {
    $$('.world-canvas').forEach(function (cv) {
      var kind = cv.dataset.world || 'create';
      if (!T.cosmos) return;
      var eng = T.cosmos(cv, {
        fit: true,
        density: kind === 'create' ? 0.00018 : 0.00012,
        minNodes: 26,
        cfg: kind === 'create'
          ? { dust: 34, link: 92, nodes: 96 }
          : { dust: 88, link: 150, nodes: 84 }
      });
      if (eng) T.engine(eng);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Derived counts (hero, worlds, section notes)                        */
  /* ------------------------------------------------------------------ */
  function fillCounts(content) {
    var posts = content.posts();
    var create = posts.filter(function (r) { return r.section === 'create'; }).length;
    var observe = posts.length - create;
    var topics = Object.keys(content.tagMap()).length;

    $$('[data-count]').forEach(function (node) {
      var key = node.dataset.count;
      var val = {
        posts: posts.length,
        create: create,
        observe: observe,
        projects: (content.projects || []).length,
        topics: topics,
        latest: posts.length ? posts[0].date : '—'
      }[key];
      if (val !== undefined) node.textContent = val;
    });

    $$('.sec-note[data-count-note]').forEach(function (node) {
      var n = parseInt(node.dataset.countNote, 10);
      node.textContent = n === 2 ? (content.projects || []).length + ' 个项目'
        : '最近 ' + ymd(posts.length ? posts[0].date : '');
    });
  }

  /* ------------------------------------------------------------------ */
  /* FEATURED STORIES                                                    */
  /* ------------------------------------------------------------------ */
  function storyCard(rec, lead, rv) {
    var a = make('a', 'story' + (rv || '') + (lead ? ' story--lead' : ''));
    a.href = rec.href;
    if (!lead) {
      var cover = make('div', 'story-cover');
      var hue = hueOf(rec.href);
      cover.style.background =
        'radial-gradient(circle at 78% 12%, hsla(' + (hue + 30) + ',78%,62%,0.28), transparent 46%),' +
        'radial-gradient(circle at 16% 88%, hsla(' + hue + ',72%,48%,0.34), transparent 52%),' +
        'linear-gradient(120deg,#150C2B,#0A0714)';
      a.appendChild(cover);
    }
    var eb = make('div', 'story-eyebrow',
      (lead ? 'Featured · ' : '') + (rec.section === 'create' ? 'Create' : 'Observe') +
      (rec.category ? ' / ' + rec.category : ''));
    var h = make('h3', 'story-title', rec.title);
    var p = make('p', 'story-excerpt', rec.excerpt || '—');
    var foot = make('div', 'story-foot');
    foot.appendChild(make('span', '', rec.dateLabel || rec.date));
    foot.appendChild(make('span', 'meta-dot', '·'));
    foot.appendChild(make('span', '', (rec.minutes || '?') + ' min'));
    (rec.tags || []).slice(0, lead ? 4 : 2).forEach(function (t) {
      var chip = make('span', '', '#' + t);
      chip.style.color = 'var(--nebula-violet)';
      chip.style.fontFamily = 'var(--font-mono)';
      chip.style.fontSize = '10px';
      chip.style.letterSpacing = '0.14em';
      foot.appendChild(chip);
    });
    a.appendChild(eb);
    a.appendChild(h);
    a.appendChild(p);
    a.appendChild(foot);
    return a;
  }

  function fillStories(content) {
    $$('[data-fill="stories"]').forEach(function (wrap) {
      var all = content.posts();
      if (!all.length) {
        wrap.innerHTML = '<p class="empty-note">内容索引暂时不可用，直接查看 <a href="/archives/">归档</a>。</p>';
        return;
      }
      var pinned = ((content.site && content.site.featured) || [])
        .map(function (h) { return content.find(h); })
        .filter(Boolean);
      var pool = pinned.concat(all.filter(function (r) { return pinned.indexOf(r) === -1; }));
      var leadCount = 1;
      var more = Math.min(4, pool.length - leadCount);
      var rv = animateOnce('stories');
      wrap.innerHTML = '';
      var lead = storyCard(pool[0], true, rv);
      lead.classList.add('span-7');
      wrap.appendChild(lead);
      for (var i = 1; i <= more; i++) {
        var c = storyCard(pool[i], false, rv);
        c.classList.add(i <= 2 ? 'span-5' : 'span-4');
        wrap.appendChild(c);
      }
      if (pool.length > more + 1) {
        var moreLink = make('a', 'chip span-4', '全部 ' + all.length + ' 篇 →');
        moreLink.href = '/archives/';
        moreLink.style.alignSelf = 'end';
        wrap.appendChild(moreLink);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* PROJECT GALAXY                                                      */
  /* ------------------------------------------------------------------ */
  /* The card is a doorway, not an abstract: name, one line in the author's own
     words, the few tags that identify the stack, and a way in. Status, versions
     and limits live on the project page. */
  function projectCard(p, rv) {
    var a = make('a', 'pcard' + (rv || ''));
    a.href = '/projects/' + p.slug + '/';
    a.innerHTML =
      '<span class="pcard-visual"></span>' +
      '<span class="pcard-top"><span class="pcard-name"></span><span class="status"></span></span>' +
      '<span class="pcard-desc"><span class="d"></span></span>' +
      '<span class="pcard-stack"></span>' +
      '<span class="pcard-foot"><span class="pcard-go">查看项目 <i class="arrow">→</i></span></span>';
    a.querySelector('.pcard-name').textContent = p.name;
    var st = a.querySelector('.status');
    st.textContent = p.status || 'active';
    st.classList.add(p.status === 'Active' ? 'status--live' : p.status === 'In development' ? 'status--wip' : 'status--arch');
    a.querySelector('.d').textContent = p.tagline || '';
    (p.stack || []).slice(0, 3).forEach(function (t) { a.querySelector('.pcard-stack').appendChild(make('span', '', t)); });
    return a;
  }

  function fillGalaxy(content) {
    $$('[data-fill="galaxy"]').forEach(function (wrap) {
      var list = (content.projects || []).slice();
      if (wrap.dataset.limit) list = list.slice(0, parseInt(wrap.dataset.limit, 10));
      if (!list.length) {
        wrap.innerHTML = '<p class="empty-note">还没有内容。</p>';
        return;
      }
      wrap.innerHTML = '';
      var rv = animateOnce('galaxy');
      list.forEach(function (p) { wrap.appendChild(projectCard(p, rv)); });
    });
  }

  /* ------------------------------------------------------------------ */
  /* EVOLUTION timeline                                                  */
  /* ------------------------------------------------------------------ */
  function fillEvolution(content) {
    $$('[data-fill="evo"]').forEach(function (wrap) {
      var items = [];
      content.posts().forEach(function (r) {
        if (!r.date) return;
        items.push({
          date: r.date, kind: r.section === 'create' ? 'Create 记录' : 'Observe 记录',
          title: r.title, href: r.href,
          desc: r.excerpt || ''
        });
      });
      (content.projects || []).forEach(function (p) {
        if (p.since) items.push({
          date: p.since, kind: '项目启动', title: p.name, href: '/projects/' + p.slug + '/',
          desc: (p.tagline || '') + (p.status ? ' · 当前状态：' + p.status : '')
        });
        (p.versions || []).forEach(function (v) {
          if (!v.date) return;
          items.push({
            date: v.date, kind: '版本 ' + (v.ver || ''), title: p.name + ' · ' + (v.label || ''),
            href: '/projects/' + p.slug + '/', desc: v.note || ''
          });
        });
      });

      // Manual milestones sit in the same stream as the derived entries, so a
      // date that only exists in the repo's own history can still be read.
      ((content.site || {}).milestones || []).forEach(function (m) {
        if (!m.date) return;
        items.push({
          date: m.date, kind: '站点里程碑', title: m.title,
          href: m.href || '/', desc: m.desc || ''
        });
      });

      items.sort(function (a, b) { return b.date.localeCompare(a.date); });
      var limit = parseInt(wrap.dataset.limit || '24', 10);
      items = items.slice(0, limit);

      wrap.innerHTML = '';
      var year = null;
      items.forEach(function (it) {
        var y = it.date.slice(0, 4);
        if (y !== year) {
          year = y;
          wrap.appendChild(make('div', 'evo-year', y));
        }
        var row = make('a', 'evo-item');
        row.href = it.href;
        row.appendChild(make('span', 'evo-date', it.date));
        var body = make('span');
        body.appendChild(make('span', 'evo-title', it.title));
        body.appendChild(make('span', 'evo-kind', it.kind));
        if (it.desc) body.appendChild(make('span', 'evo-desc', it.desc.slice(0, 120)));
        row.appendChild(body);
        wrap.appendChild(row);
      });
      if (T.lit) T.lit('.evo-item', 'is-lit', 0.25);
    });
  }

  /* ------------------------------------------------------------------ */
  /* FRAGMENTS — sentences cut verbatim out of the articles themselves   */
  /* ------------------------------------------------------------------ */
  function fragTier(f) {
    var n = f.text.length;
    if (n <= 26) return 's';
    if (n <= 52) return 'm';
    if (n <= 84) return 'l';
    return 'xl';
  }

  // A stable per-sentence offset: re-rendering must not shuffle the wall.
  function fragSeed(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 131 + str.charCodeAt(i)) & 0xffff;
    return h;
  }

  function fragCard(f, cls) {
    var node = make('article', 'frag frag--' + fragTier(f) + (cls || ''));
    var seed = fragSeed(f.text);
    node.style.setProperty('--dx', ((seed % 18) - 9) + 'px');
    node.style.setProperty('--dy', ((seed >> 4) % 13) - 6 + 'px');
    node.appendChild(make('span', 'frag-mark'));
    node.appendChild(make('p', 'frag-text', f.text));
    var foot = make('footer', 'frag-foot');
    foot.appendChild(make('span', 'frag-topic', f.topic));
    var src = make('span', 'frag-src');
    if (f.href) {
      var a = make('a', '', f.title);
      a.href = f.href;
      src.appendChild(a);
      src.appendChild(make('span', 'frag-date', f.date || ''));
    } else {
      src.appendChild(make('span', 'frag-stand', '独立记录 · ' + (f.date || '')));
    }
    foot.appendChild(src);
    node.appendChild(foot);
    return node;
  }

  function fillFragments(content) {
    var list = content.fragments();
    $$('[data-fill="frags"]').forEach(function (wrap) {
      var rv = animateOnce('frags');
      var shown = list.slice(0, T.small ? 9 : 12);
      wrap.innerHTML = '';
      if (!shown.length) {
        wrap.appendChild(make('p', 'empty-note', '还没有内容。'));
        return;
      }
      shown.forEach(function (f, i) {
        var card = fragCard(f, rv);
        if (i === 0) card.classList.add('frag--hero');
        wrap.appendChild(card);
      });
      if (list.length > shown.length) {
        var more = make('a', 'frags-more');
        more.href = '/fragments/';
        more.appendChild(make('span', 'fm-label', '展开更多碎片'));
        more.appendChild(make('span', 'fm-count', '共 ' + list.length + ' 条'));
        more.appendChild(make('span', 'arrow', '→'));
        wrap.appendChild(more);
      }
    });
    $$('[data-fill="fragments-all"]').forEach(function (wrap) {
      var rv = animateOnce('frag-all');
      wrap.innerHTML = '';
      if (!list.length) {
        wrap.appendChild(make('p', 'empty-note', '还没有内容。'));
        return;
      }
      list.forEach(function (f, i) {
        var card = fragCard(f, rv);
        if (i === 0) card.classList.add('frag--hero');
        wrap.appendChild(card);
      });
    });
    $$('[data-fill="fragments-count"]').forEach(function (node) {
      node.textContent = String(list.length);
    });
    $$('[data-fill="fragments-filters"]').forEach(function (wrap) {
      if (wrap.dataset.done) return;
      var topics = {};
      list.forEach(function (f) { topics[f.topic] = (topics[f.topic] || 0) + 1; });
      var rows = Object.keys(topics).map(function (k) { return { topic: k, n: topics[k] }; })
        .sort(function (a, b) { return b.n - a.n || (a.topic < b.topic ? -1 : 1); });
      if (rows.length < 2) return;
      wrap.dataset.done = '1';
      wrap.innerHTML = '';
      var all = make('button', 'fx is-on');
      all.type = 'button';
      all.appendChild(make('span', '', '全部'));
      all.appendChild(make('span', 'count', String(list.length)));
      wrap.appendChild(all);
      rows.forEach(function (x) {
        var b = make('button', 'fx');
        b.type = 'button';
        b.dataset.topic = x.topic;
        b.appendChild(make('span', '', x.topic));
        b.appendChild(make('span', 'count', String(x.n)));
        wrap.appendChild(b);
      });
      var wall = wrap.parentNode.querySelector('[data-fill="fragments-all"]');
      wrap.addEventListener('click', function (e) {
        var btn = e.target.closest('.fx');
        if (!btn || !wall) return;
        $$('.fx', wrap).forEach(function (b) { b.classList.toggle('is-on', b === btn); });
        var want = btn.dataset.topic || '';
        $$('.frag', wall).forEach(function (card) {
          var topic = card.querySelector('.frag-topic');
          card.hidden = !!want && (!topic || topic.textContent !== want);
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Full archive tools                                                  */
  /* ------------------------------------------------------------------ */
  function initArchiveTools(content) {
    var root = $('[data-archive-tools]');
    if (!root) return;
    var input = $('input[type=search]', root);
    var yearBox = $('[data-filters="year"]', root);
    var kindBox = $('[data-filters="kind"]', root);
    var tagBox = $('[data-filters="tag"]', root);
    var listHost = $('.entry-list', root);
    var countLine = $('[data-archive-count]', root);

    var state = { q: '', year: '', kind: '', tag: '' };

    // The static markup stays in the DOM for no-JS readers; we render our own.
    function kindsOf(r) { return r.section === 'create' ? 'Create' : 'Observe'; }

    function buildFilters() {
      var years = {};
      var tags = {};
      content.posts().forEach(function (r) {
        years[(r.date || '').slice(0, 4)] = (years[(r.date || '').slice(0, 4)] || 0) + 1;
        (r.tags || []).concat([r.category]).filter(Boolean).forEach(function (t) {
          tags[t] = (tags[t] || 0) + 1;
        });
      });
      yearBox.innerHTML = '';
      kindBox.innerHTML = '';
      tagBox.innerHTML = '';

      yearBox.appendChild(filterChip('全部年份', '', 'year', content.posts().length));
      Object.keys(years).sort().reverse().forEach(function (y) {
        if (y) yearBox.appendChild(filterChip(y, y, 'year', years[y]));
      });
      ['Create', 'Observe'].forEach(function (k) {
        kindBox.appendChild(filterChip(k, k, 'kind',
          content.posts().filter(function (r) { return kindsOf(r) === k; }).length));
      });
      tagBox.appendChild(filterChip('全部主题', '', 'tag', content.posts().length));
      Object.keys(tags).sort(function (a, b) {
        return tags[b] - tags[a] || (a < b ? -1 : 1);
      }).forEach(function (t) {
        tagBox.appendChild(filterChip('#' + t, t, 'tag', tags[t]));
      });
    }

    function filterChip(label, value, key, count) {
      var b = make('button', 'chip');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span class="l"></span><span class="count"></span>';
      b.querySelector('.l').textContent = label;
      b.querySelector('.count').textContent = count;
      b.dataset.filterKey = key;
      b.dataset.filterValue = value;
      b.addEventListener('click', function () {
        state[key] = state[key] === value ? '' : value;
        if (key === 'tag') writeHash(state.tag);
        syncPressed(key);
        render();
      });
      return b;
    }

    // #tag-<topic> is the link every other page uses to point at one topic,
    // so choosing a topic here has to keep that same shape.
    function writeHash(tag) {
      if (tag) {
        var want = '#tag-' + encodeURIComponent(tag);
        if (location.hash !== want) history.replaceState(null, '', want);
      } else if (location.hash) {
        history.replaceState(null, '', location.pathname);
      }
    }

    function readHash() {
      var m = /^#tag-(.+)$/.exec(location.hash);
      state.tag = m ? decodeURIComponent(m[1]) : '';
      syncPressed('tag');
    }

    // Only the chips of the group that changed re-evaluate their pressed state,
    // so a tag called "Create" cannot light up the Create kind filter.
    function syncPressed(changedKey) {
      var groups = [yearBox, kindBox, tagBox];
      var target = changedKey === 'year' ? yearBox : changedKey === 'kind' ? kindBox : tagBox;
      groups.forEach(function (box) {
        if (box !== target) return;
        $$('.chip', box).forEach(function (c) {
          var on = c.dataset.filterKey === changedKey && c.dataset.filterValue === state[changedKey];
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    }

    function render() {
      var rows = content.search(state.q).filter(function (r) {
        if (state.year && (r.date || '').slice(0, 4) !== state.year) return false;
        if (state.kind && kindsOf(r) !== state.kind) return false;
        if (state.tag) {
          var own = (r.tags || []).concat([r.category]);
          if (own.indexOf(state.tag) === -1) return false;
        }
        return true;
      });

      listHost.innerHTML = '';
      if (!rows.length) {
        listHost.appendChild(make('p', 'empty-note', '没有匹配的记录。试试清空关键词，或浏览 ' + (state.tag ? '其他主题' : '全部主题') + '。'));
      } else {
        rows.forEach(function (r) {
          var a = make('a', 'entry');
          a.href = r.href;
          var d = make('span', 'entry-date', r.date ? r.date.replace(/-/g, ' · ') : '');
          var body = make('div', 'entry-body');
          body.appendChild(make('h2', 'entry-title', r.title));
          if (r.excerpt) body.appendChild(make('p', 'entry-line', r.excerpt));
          var meta = make('span', 'entry-meta',
            kindsOf(r) + (r.minutes ? ' · ' + r.minutes + ' min' : ''));
          a.appendChild(d); a.appendChild(body); a.appendChild(meta);
          listHost.appendChild(a);
        });
      }

      var total = content.posts().length;
      countLine.textContent = '';
      countLine.appendChild(make('span', '', '显示 '));
      countLine.appendChild(make('b', '', rows.length));
      countLine.appendChild(make('span', '', ' / 共 ' + total + ' 篇'));
    }

    if (input) {
      input.addEventListener('input', function () { state.q = input.value; render(); });
    }
    content.on(function () {
      buildFilters();
      readHash();
      render();
    });
    window.addEventListener('hashchange', function () {
      readHash();
      render();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Topic index used by Create / Observe pages                          */
  /* ------------------------------------------------------------------ */
  function fillTopicIndex(content) {
    $$('[data-fill="topics"]').forEach(function (wrap) {
      var map = content.tagMap();
      var want = wrap.dataset.topics; // 'create' | 'observe' | 'all'
      var rows = Object.keys(map).map(function (k) {
        var hits = (map[k].hrefs || []).filter(function (h) {
          var r = content.find(h);
          return r && (want === 'all' || r.section === want);
        });
        return { tag: k, n: hits.length + (map[k].projects || []).length };
      }).filter(function (x) { return x.n > 0; })
        .sort(function (a, b) { return b.n - a.n; }).slice(0, 18);

      wrap.innerHTML = '';
      rows.forEach(function (x) {
        var a = make('a', 'chip', '#' + x.tag + ' ');
        a.href = '/archives/#tag-' + encodeURIComponent(x.tag);
        a.appendChild(make('span', 'count', x.n));
        wrap.appendChild(a);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Topic islands — weight follows volume, so the shape comes from data  */
  /* ------------------------------------------------------------------ */
  function topicRows(content) {
    var map = content.tagMap();
    var notes = (content.site || {}).topicNotes || {};
    return Object.keys(map)
      .filter(function (k) { return k !== 'Create' && k !== 'Observe'; })
      .map(function (k) {
        var hrefs = map[k].hrefs || [];
        var recs = hrefs.map(content.find).filter(Boolean)
          .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        var projects = (map[k].projects || []).map(function (p) {
          return typeof p === 'string' ? { slug: p } : p;
        });
        return {
          tag: k,
          posts: hrefs.length,
          projectList: projects,
          projects: projects.length,
          first: hrefs[0] || '',
          line: notes[k] || '',
          latest: recs.length ? recs[0] : null,
          total: hrefs.length + projects.length
        };
      })
      .filter(function (x) { return x.total > 0; })
      .sort(function (a, b) { return b.total - a.total || (a.tag < b.tag ? -1 : 1); });
  }

  /* ------------------------------------------------------------------ */
  /* Shared nav highlight + spine                                        */
  /* ------------------------------------------------------------------ */
  function initNav() {
    var nav = $('.orbit-nav');
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle('is-solid', window.scrollY > 80); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  function boot() {
    initHero();
    initWorlds();
    initNav();

    var cx = $('#constellation');
    if (cx && window.TANCEConstellation) window.TANCEConstellation.mount(cx);

    var timer = null;
    function renderAll() {
      var content = T.content;
      fillCounts(content);
      fillStories(content);
      fillGalaxy(content);
      fillEvolution(content);
      fillFragments(content);
      fillTopicIndex(content);
      if (T.reveal) T.reveal();
    }
    // Content keeps arriving as articles are read in the background; coalesce
    // those updates so a section is not rebuilt dozens of times.
    T.content.on(function () {
      clearTimeout(timer);
      timer = setTimeout(renderAll, 120);
    });

    initArchiveTools(T.content);
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
