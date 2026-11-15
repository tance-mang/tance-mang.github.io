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

  function relTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 60) return mins + ' 分钟前';
    if (mins < 1440) return Math.round(mins / 60) + ' 小时前';
    return Math.round(mins / 1440) + ' 天前';
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
    var tags = Object.keys(content.tagMap()).length;

    $$('[data-count]').forEach(function (node) {
      var key = node.dataset.count;
      var val = {
        posts: posts.length,
        create: create,
        observe: observe,
        projects: (content.projects || []).length,
        topics: tags,
        latest: posts.length ? posts[0].date : '—'
      }[key];
      if (val !== undefined) node.textContent = val;
    });

    $$('.sec-note[data-count-note]').forEach(function (node) {
      var n = parseInt(node.dataset.countNote, 10);
      node.textContent = n === 1 ? '按标签自动分成两侧 · 共 ' + posts.length + ' 篇'
        : n === 2 ? '来自 ' + (content.projects || []).length + ' 个公开仓库'
        : n === 4 ? '共 ' + tags + ' 个主题，取自站内真实标签'
        : '记录与仓库时间线合并 · 最近 ' + ymd(posts.length ? posts[0].date : '');
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
    var p = make('p', 'story-excerpt', rec.excerpt || '摘要将在读取原文后自动出现。');
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
  function projectCard(p, rv) {
    var a = make('a', 'pcard' + (rv || ''));
    a.href = '/projects/' + p.slug + '/';
    a.innerHTML =
      '<span class="pcard-visual"></span>' +
      '<span class="pcard-top"><span class="pcard-name"></span><span class="status"></span></span>' +
      '<span class="pcard-desc"><span class="d"></span><span class="s"></span></span>' +
      '<span class="pcard-stack"></span>' +
      '<span class="pcard-foot"></span>';
    a.querySelector('.pcard-name').textContent = p.name;
    var st = a.querySelector('.status');
    st.textContent = p.status || 'active';
    st.classList.add(p.status === 'Active' ? 'status--live' : p.status === 'In development' ? 'status--wip' : 'status--arch');
    a.querySelector('.d').textContent = p.tagline || '';
    if (p.summary) {
      var s = make('span', 's');
      s.style.color = 'var(--nebula-violet)';
      s.style.fontSize = '12px';
      s.textContent = p.summary;
      a.querySelector('.pcard-desc').appendChild(s);
    }
    (p.stack || []).slice(0, 5).forEach(function (t) { a.querySelector('.pcard-stack').appendChild(make('span', '', t)); });
    var foot = a.querySelector('.pcard-foot');
    foot.appendChild(make('span', '', (p.language || '—')));
    if (p.visibility === 'private') foot.appendChild(make('span', 'pcard-priv', '私有仓库'));
    if (p.stars) foot.appendChild(make('span', '', '★ ' + p.stars));
    if (p.forks) foot.appendChild(make('span', '', '⑂ ' + p.forks));
    foot.appendChild(make('span', '', 'since ' + (p.since || '').slice(0, 10)));
    return a;
  }

  function fillGalaxy(content) {
    $$('[data-fill="galaxy"]').forEach(function (wrap) {
      var list = (content.projects || []).slice();
      if (wrap.dataset.limit) list = list.slice(0, parseInt(wrap.dataset.limit, 10));
      if (!list.length) {
        wrap.innerHTML = '<p class="empty-note">项目数据尚未载入。</p>';
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
  /* FRAGMENTS (real quotes pulled out of the Observe articles)          */
  /* ------------------------------------------------------------------ */
  function fillFragments(content) {
    $$('[data-fill="frags"]').forEach(function (wrap) {
      var rv = animateOnce('frags');
      var source = content.inSection('observe');
      var withQuotes = source.filter(function (r) { return r.quotes && r.quotes.length; });
      wrap.innerHTML = '';
      if (!withQuotes.length) {
        // Nothing enriched yet — fall back to the excerpts already in the lists.
        var excerpted = source.filter(function (r) { return r.excerpt; }).slice(0, 5);
        if (!excerpted.length) { wrap.innerHTML = '<p class="empty-note">正在读取原文中的片段…</p>'; return; }
        excerpted.forEach(function (r) { wrap.appendChild(fragCard(r.excerpt, r, rv)); });
        return;
      }
      withQuotes.slice(0, 4).forEach(function (r) {
        wrap.appendChild(fragCard(r.quotes[0], r, rv));
      });
      source.slice(0, 2).forEach(function (r) {
        if (r.quotes && r.quotes[1]) wrap.appendChild(fragCard(r.quotes[1], r, rv));
      });
    });
  }

  function fragCard(text, rec, rv) {
    var a = make('a', 'frag' + (rv || ''));
    a.href = rec.href;
    a.appendChild(make('span', 'frag-mark'));
    a.appendChild(make('p', 'frag-quote', '“' + text + '”'));
    a.appendChild(make('span', 'frag-src', rec.title + ' · ' + (rec.date || '')));
    return a;
  }

  /* ------------------------------------------------------------------ */
  /* LIVE SIGNAL — real GitHub activity, honestly labelled               */
  /* ------------------------------------------------------------------ */
  var signalRequested = false;

  function fillSignal(content) {
    $$('[data-fill="signal"]').forEach(function (wrap) {
      var sec = wrap.closest('.sec') || wrap;
      var postsCol = wrap.querySelector('[data-signal="posts"]');
      var ghCol = sec.querySelector('[data-signal="github"]') || wrap.querySelector('[data-signal="github"]');
      var state = sec.querySelector('[data-signal="state"]');

      if (postsCol) {
        postsCol.innerHTML = '';
        content.posts().slice(0, 5).forEach(function (r) {
          var a = make('a', 'signal-item');
          a.href = r.href;
          a.appendChild(make('span', 'signal-when', r.date));
          a.appendChild(make('span', '', r.title));
          postsCol.appendChild(a);
        });
      }

      if (!ghCol || !state) return;
      if (ghCol.dataset.filled || signalRequested) return;

      var snapshot = (content.site && content.site.snapshot) || {};
      var showSnapshot = function (why) {
        state.innerHTML = '';
        var dot = make('span', 'beacon is-idle');
        state.appendChild(dot);
        state.appendChild(make('span', '', '离线快照 · ' + (snapshot.date || '—') + (why ? '（' + why + '）' : '')));
        ghCol.innerHTML = '';
        (snapshot.activity || []).forEach(function (row) {
          var a = make('a', 'signal-item');
          a.href = row.href || ('https://github.com/tance-mang/' + (row.repo || ''));
          a.appendChild(make('span', 'signal-when', row.date || ''));
          a.appendChild(make('span', '', row.text || ''));
          ghCol.appendChild(a);
        });
        if (!snapshot.activity || !snapshot.activity.length) {
          ghCol.appendChild(make('p', 'signal-note', '未配置快照数据。'));
        }
        ghCol.dataset.filled = '1';
      };

      if (!window.fetch) { showSnapshot('浏览器不支持 fetch'); return; }

      signalRequested = true;
      fetch('https://api.github.com/users/tance-mang/events/public?per_page=40')
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (events) {
          var rows = [];
          events.forEach(function (e) {
            var text = null;
            if (e.type === 'PushEvent') {
              var c = (e.payload.commits || []).slice(-1)[0];
              text = 'push 到 ' + e.repo.name.split('/')[1] + '：' +
                (c && c.message ? c.message.split('\n')[0].slice(0, 58) : (e.payload.size || 0) + ' commits');
            } else if (e.type === 'CreateEvent' && e.payload.ref_type === 'repository') {
              text = '新建仓库 ' + e.repo.name.split('/')[1];
            } else if (e.type === 'ReleaseEvent') {
              text = '发布 ' + e.payload.release.tag_name + ' · ' + e.repo.name.split('/')[1];
            } else if (e.type === 'WatchEvent' || e.type === 'ForkEvent') {
              text = e.type === 'ForkEvent' ? '被 fork：' + e.repo.name.split('/')[1] : null;
            } else if (e.type === 'IssueCommentEvent' || e.type === 'IssuesEvent') {
              text = e.type === 'IssuesEvent'
                ? e.payload.action + ' issue · ' + e.repo.name.split('/')[1]
                : '评论 · ' + e.repo.name.split('/')[1];
            }
            if (!text) return;
            rows.push({ when: e.created_at, text: text, repo: e.repo.name.split('/')[1] });
          });
          if (!rows.length) throw new Error('no public events');
          state.innerHTML = '';
          state.appendChild(make('span', 'beacon'));
          var synced = new Date();
          state.appendChild(make('span', '', '实时 · 同步于 ' +
            synced.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) +
            ' · 来源 GitHub Events API'));
          ghCol.innerHTML = '';
          rows.slice(0, 6).forEach(function (row) {
            var a = make('a', 'signal-item');
            a.href = 'https://github.com/tance-mang/' + row.repo;
            a.appendChild(make('span', 'signal-when', relTime(row.when)));
            a.appendChild(make('span', '', row.text));
            ghCol.appendChild(a);
          });
          var note = make('p', 'signal-note',
            '以上为 GitHub 公开事件流，每次访问实时拉取；速率限制耗尽时自动回落到快照。');
          ghCol.appendChild(note);
          ghCol.dataset.filled = '1';
        })
        .catch(function (err) { showSnapshot(err.message); });
    });
  }

  /* ------------------------------------------------------------------ */
  /* ARCHIVE preview + full archive tools                                */
  /* ------------------------------------------------------------------ */
  function fillArchivePreview(content) {
    $$('[data-fill="arch-preview"]').forEach(function (wrap) {
      var byYear = {};
      content.posts().forEach(function (r) {
        var y = (r.date || '未知').slice(0, 4);
        (byYear[y] = byYear[y] || []).push(r);
      });
      wrap.innerHTML = '';
      Object.keys(byYear).sort().reverse().slice(0, 2).forEach(function (y) {
        var g = make('div', 'arch-year-group');
        g.appendChild(make('h3', 'arch-year', y));
        var rows = make('div', 'arch-rows');
        byYear[y].slice(0, 8).forEach(function (r) {
          var a = make('a', 'arch-row');
          a.href = r.href;
          a.appendChild(make('span', '', r.title));
          a.appendChild(make('span', 'ar-date', r.date.slice(5)));
          rows.appendChild(a);
        });
        g.appendChild(rows);
        wrap.appendChild(g);
      });
    });
  }

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
      Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; }).slice(0, 14).forEach(function (t) {
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
        syncPressed(key);
        render();
      });
      return b;
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
      countLine.appendChild(make('span', '', ' / 共 ' + total + ' 篇 · 主题 ' + Object.keys(content.tagMap()).length + ' 个'));
    }

    if (input) {
      input.addEventListener('input', function () { state.q = input.value; render(); });
    }
    content.on(function () {
      buildFilters();
      render();
      if (location.hash.indexOf('#tag-') === 0) {
        state.tag = decodeURIComponent(location.hash.slice(5));
        syncPressed('tag');
        render();
      }
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
  /* Topic overview — the homepage's own reading of the tag cloud        */
  /* ------------------------------------------------------------------ */
  function fillTopicOverview(content) {
    $$('[data-fill="topic-overview"]').forEach(function (wrap) {
      var map = content.tagMap();
      var notes = (content.site || {}).topicNotes || {};
      var rows = Object.keys(map)
        .filter(function (k) { return k !== 'Create' && k !== 'Observe'; })
        .map(function (k) {
          var hrefs = map[k].hrefs || [];
          var recs = hrefs.map(content.find).filter(Boolean)
            .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
          return {
            tag: k,
            posts: hrefs.length,
            projects: (map[k].projects || []).length,
            line: notes[k] || (recs.length ? '最近一篇：' + recs[0].title : ''),
            latest: recs.length ? recs[0].date : ''
          };
        })
        .filter(function (x) { return x.posts + x.projects > 0; })
        .sort(function (a, b) { return (b.posts + b.projects) - (a.posts + a.projects); })
        .slice(0, 12);

      var top = rows.length ? rows[0].posts + rows[0].projects : 1;
      wrap.innerHTML = '';
      rows.forEach(function (x) {
        var total = x.posts + x.projects;
        var a = make('a', 'tp');
        a.href = '/archives/#tag-' + encodeURIComponent(x.tag);
        a.appendChild(make('span', 'tp-tag', '#' + x.tag));
        a.appendChild(make('span', 'tp-line', x.line || '这个主题还没有写简介。'));
        var meta = make('span', 'tp-meta');
        meta.textContent = x.posts + ' 篇记录' + (x.projects ? ' · ' + x.projects + ' 个项目' : '');
        a.appendChild(meta);
        var bar = make('span', 'tp-bar');
        bar.appendChild(make('i'));
        bar.firstChild.style.setProperty('--w', Math.round(total / top * 100) + '%');
        a.appendChild(bar);
        wrap.appendChild(a);
      });
    });
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
    if (T.lit) T.lit('.mline', 'is-lit', 0.55);

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
      fillSignal(content);
      fillArchivePreview(content);
      fillTopicIndex(content);
      fillTopicOverview(content);
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
