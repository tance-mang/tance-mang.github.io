/*
 * tools/gen-feeds.mjs
 * Generates feed.xml and sitemap.xml from the same article lists the browser
 * index reads. Run it after adding an article (or let the optional workflow do it):
 *
 *   node tools/gen-feeds.mjs
 *
 * The homepage, archive, search, constellation and timeline need nothing from
 * this file — they derive from the HTML lists at runtime. RSS and sitemap are
 * the only parts of a static site that must exist as committed XML.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = JSON.parse(readFileSync(join(ROOT, 'data/site.json'), 'utf8'));
const BASE = SITE.baseUrl.replace(/\/$/, '');
const PROJECTS = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8'));

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function entries(file) {
  const path = join(ROOT, file);
  if (!existsSync(path)) return [];
  const html = readFileSync(path, 'utf8');
  const out = [];
  for (const m of html.matchAll(/<a href="([^"]+)" class="entry">([\s\S]*?)<\/a>/g)) {
    const inner = m[2];
    const title = /<h2 class="entry-title">([\s\S]*?)<\/h2>/.exec(inner);
    const line = /<p class="entry-line">([\s\S]*?)<\/p>/.exec(inner);
    const date = /<span class="entry-date">([\s\S]*?)<\/span>/.exec(inner);
    if (!title) continue;
    const clean = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    out.push({
      href: m[1],
      title: clean(title[1]),
      excerpt: clean(line && line[1]),
      dateLabel: clean(date && date[1])
    });
  }
  return out;
}

function articleMeta(href) {
  const file = join(ROOT, href.replace(/^\//, ''), 'index.html');
  if (!existsSync(file)) return {};
  const html = readFileSync(file, 'utf8');
  const dt = /<time datetime="(\d{4}-\d{2}-\d{2})">/.exec(html);
  const desc = /<meta name="description" content="([^"]*)">/.exec(html);
  const meta = /<div class="post-meta">([\s\S]*?)<\/div>/.exec(html);
  const tags = meta
    ? [...meta[1].matchAll(/<span>([^<]{2,40})<\/span>/g)].map((m) => m[1].trim())
        .filter((t) => !/^\d+\s*min$/i.test(t) && !/^[·\/]$/.test(t))
    : [];
  return {
    date: dt ? dt[1] : '',
    description: desc ? desc[1] : '',
    tags: tags.join(', ')
  };
}

const all = [];
for (const file of ['create.html', 'observe.html', 'archives/index.html']) {
  for (const e of entries(file)) if (!all.some((x) => x.href === e.href)) all.push(e);
}
all.sort((a, b) => (b.href.match(/\d{4}\/\d{2}\/\d{2}/)?.[0] || '').localeCompare(a.href.match(/\d{4}\/\d{2}\/\d{2}/)?.[0] || ''));

const items = all.map((e) => {
  const day = e.href.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  const iso = day ? `${day[1]}-${day[2]}-${day[3]}` : e.dateLabel.replace(/\D/g, '').replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
  const meta = articleMeta(e.href);
  const date = meta.date || iso;
  const pub = date ? new Date(`${date}T12:00:00+08:00`).toUTCString() : new Date().toUTCString();
  const link = `${BASE}${e.href.replace(/\/$/, '')}/`;
  const body = esc(meta.description || e.excerpt || e.title);
  return `    <item>
      <title>${esc(e.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pub}</pubDate>
      <description>${body}</description>
${meta.tags ? `      <category>${esc(meta.tags)}</category>\n` : ''}    </item>`;
});

const now = new Date().toUTCString();
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)} · ${esc(SITE.subtitle)}</title>
    <link>${BASE}/</link>
    <description>${esc(SITE.tagline)} Create 与 Observe 两侧的技术记录与思考。</description>
    <language>${esc(SITE.locale)}</language>
    <lastBuildDate>${now}</lastBuildDate>
    <managingEditor>${esc(SITE.email)} (${esc(SITE.author)})</managingEditor>
    <webMaster>${esc(SITE.email)} (${esc(SITE.author)})</webMaster>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>
`;

const siteDate = SITE.snapshot?.date || new Date().toISOString().slice(0, 10);
const urls = [
  { loc: '/', pri: '1.0', change: 'weekly', date: siteDate },
  { loc: '/create.html', pri: '0.9', change: 'weekly', date: siteDate },
  { loc: '/observe.html', pri: '0.9', change: 'weekly', date: siteDate },
  { loc: '/archives/', pri: '0.8', change: 'weekly', date: siteDate },
  { loc: '/fragments/', pri: '0.7', change: 'weekly', date: siteDate },
  { loc: '/projects/', pri: '0.8', change: 'monthly', date: siteDate },
  { loc: '/orbit/', pri: '0.7', change: 'monthly', date: siteDate },
  { loc: '/about.html', pri: '0.7', change: 'monthly', date: siteDate }
];
for (const e of all) {
  const d = e.href.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  urls.push({ loc: e.href.replace(/\/$/, '') + '/', pri: '0.7', change: 'monthly', date: d ? `${d[1]}-${d[2]}-${d[3]}` : siteDate });
}
for (const p of PROJECTS) urls.push({ loc: `/projects/${p.slug}/`, pri: '0.6', change: 'monthly', date: p.updated || siteDate });

const siteMap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${BASE}${u.loc}</loc>
    <lastmod>${u.date}</lastmod>
    <changefreq>${u.change}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`;

writeFileSync(join(ROOT, 'feed.xml'), feed, 'utf8');
writeFileSync(join(ROOT, 'sitemap.xml'), siteMap, 'utf8');
console.log(`feed.xml: ${items.length} items · sitemap.xml: ${urls.length} urls`);
