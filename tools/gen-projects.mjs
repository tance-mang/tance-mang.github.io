/*
 * tools/gen-projects.mjs
 * Renders /projects/<slug>/index.html for every entry in data/projects.json.
 *
 * Zero build step at deploy time: the generated pages are committed as plain
 * static HTML, exactly like the articles. Adding a project means one JSON
 * record plus this command — never hand-editing a second file.
 *
 *   node tools/gen-projects.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = JSON.parse(readFileSync(join(ROOT, 'data/site.json'), 'utf8'));
const PROJECTS = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8'));

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Pull real titles out of the article lists so related links are never guesses. */
function readTitles() {
  const titles = {};
  for (const file of ['create.html', 'observe.html', 'archives/index.html']) {
    let html;
    try {
      html = readFileSync(join(ROOT, file), 'utf8');
    } catch {
      continue;
    }
    const entryRe = /<a href="([^"]+)" class="entry">([\s\S]*?)<\/a>/g;
    for (const m of html.matchAll(entryRe)) {
      const title = /<h2 class="entry-title">([\s\S]*?)<\/h2>/.exec(m[2]);
      if (title && !titles[m[1]]) {
        titles[m[1]] = title[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      }
    }
  }
  return titles;
}

const TITLES = readTitles();

const para = (title, text) => text
  ? `<section class="pblock"><h2>${esc(title)}</h2><p>${esc(text)}</p></section>`
  : '';

const bullets = (title, items) => (items && items.length)
  ? `<section class="pblock"><h2>${esc(title)}</h2><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></section>`
  : '';

function versionRows(versions) {
  if (!versions || !versions.length) {
    return '<p class="signal-note">该仓库没有独立的版本号记录，迭代过程保存在提交历史与 README 中。</p>';
  }
  return `<div class="pvers">${versions.map((v) => `
      <div class="pvers-row">
        <span class="ver">${esc(v.ver || '—')}</span>
        <span class="txt">${esc(v.label || '')}${v.date ? ` <span class="signal-when">${esc(v.date)}</span>` : ''}${v.note ? `<br><span class="signal-when">${esc(v.note)}</span>` : ''}</span>
      </div>`).join('')}</div>`;
}

function relatedBlock(related) {
  const hits = (related || []).filter((href) => TITLES[href]);
  if (!hits.length) return '';
  return `<section class="pblock"><h2>关联记录</h2><div class="related-list">${
    hits.map((href) => `<a href="${esc(href)}"><span>${esc(TITLES[href])}</span><span class="rel-date">站内文章</span></a>`).join('')
  }</div></section>`;
}

function page(p) {
  const isPrivate = p.visibility === 'private';
  const stats = [
    ['状态', p.status],
    ['可见性', isPrivate ? '私有仓库' : '公开仓库'],
    ['语言', p.language],
    ['起始', p.since],
    ['最近推送', p.updated],
    ['License', p.license],
    ['Stars / Forks', `${p.stars} / ${p.forks}`]
  ].map(([k, v]) => `<div class="pstat"><span class="k">${esc(k)}</span><span class="v">${esc(v ?? '—')}</span></div>`).join('');

  const topics = (p.topics || [])
    .map((t) => `<a class="chip" href="/archives/#tag-${encodeURIComponent(t)}">#${esc(t)}</a>`)
    .join(' ');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(p.name)} — 作品 · TANCE</title>
  <meta name="description" content="${esc(p.tagline)}">
  <link rel="canonical" href="${SITE.baseUrl}/projects/${p.slug}/">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(p.name)} — TANCE Projects">
  <meta property="og:description" content="${esc(p.tagline)}">
  <meta property="og:url" content="${SITE.baseUrl}/projects/${p.slug}/">
  <link rel="alternate" type="application/rss+xml" title="TANCE · Neural Orbit" href="/feed.xml">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/universe.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&family=Inter:wght@200;300;400;500;600&display=swap" rel="stylesheet">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"SoftwareApplication","name":${JSON.stringify(p.name)},
   "url":"${SITE.baseUrl}/projects/${p.slug}/","description":${JSON.stringify(p.tagline)},
   "applicationCategory":"DeveloperApplication","programmingLanguage":${JSON.stringify(p.language)},
   "sameAs":${JSON.stringify(p.repo)}}
  </script>
</head>
<body>
  <div class="bg-veil"></div>
  <canvas id="neural-net" aria-hidden="true"></canvas>
  <div class="bg-grain"></div>

  <header class="sub-header">
    <a href="/" class="sub-logo">TANCE</a>
    <nav class="sub-nav">
      <a href="/create.html">Create</a>
      <a href="/observe.html">Observe</a>
      <a href="/projects/" class="is-current">Projects</a>
      <a href="/archives/">Archive</a>
      <a href="/fragments/">Fragments</a>
      <a href="/about.html">About</a>
    </nav>
  </header>

  <main class="sub-shell pdetail">
    <section class="pdetail-hero">
      <span class="sub-eyebrow">${esc(p.kind)}</span>
      <h1 class="sub-title">${esc(p.name)}</h1>
      <p class="sub-line">${esc(p.tagline)}</p>
      <div class="tag-line" style="margin-top:20px;">${topics}</div>
      <div class="pdetail-grid">${stats}</div>
      <div class="club-actions" style="justify-content:flex-start;margin-top:26px;">
        ${isPrivate
          ? '<span class="btn btn--ghost" aria-disabled="true">仓库未公开 · 没有可访问的链接</span>'
          : `<a class="btn" href="${esc(p.repo)}" target="_blank" rel="noopener">打开仓库 <i class="arrow">→</i></a>`}
        <a class="btn btn--ghost" href="/projects/">返回作品星系</a>
      </div>
    </section>

    ${para('背景', p.background)}
    ${para('问题', p.problem)}
    ${bullets('技术实现', p.implementation)}
    ${bullets('实际验证', p.validation)}
    ${bullets('局限与未完成', p.limits)}

    <section class="pblock"><h2>版本记录</h2>${versionRows(p.versions)}</section>
    ${relatedBlock(p.related)}

    <p class="signal-note" style="margin-top:40px;">
      ${isPrivate
        ? `这个仓库目前是私有的，${esc(p.repo)} 对外部访问会返回 404。本页内容取自本地开发记录与仓库元数据，观测日期 ${esc(SITE.observed || SITE.snapshot?.date || '')}。`
        : `本页内容取自 ${esc(p.repo)} 的 README / CHANGELOG 与 GitHub 仓库元数据，观测日期 ${esc(SITE.observed || SITE.snapshot?.date || '')}。`}
      数字与状态会随仓库变化，页面不做推测性补充。
    </p>

    <footer class="post-foot">
      <a href="/projects/">← back to galaxy</a>
      <a href="/">tance</a>
    </footer>
  </main>

  <script src="/js/script.js"></script>
  <script src="/js/universe.js"></script>
</body>
</html>
`;
}

let count = 0;
const lines = [];
for (const p of PROJECTS) {
  mkdirSync(join(ROOT, 'projects', p.slug), { recursive: true });
  writeFileSync(join(ROOT, 'projects', p.slug, 'index.html'), page(p), 'utf8');
  count++;
  lines.push(`  /projects/${p.slug}/  ${p.name}${p.related && p.related.filter((h) => TITLES[h]).length ? '' : '  (no related article matched)'}`);
}

console.log(`generated ${count} project pages:\n${lines.join('\n')}`);
