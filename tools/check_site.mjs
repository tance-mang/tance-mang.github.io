/*
 * tools/check_site.mjs — structural self-check for the static site.
 *
 *   node tools/check_site.mjs
 *
 * Verifies things a browser would only reveal as a broken page:
 *   - every internal href/src/target resolves to a file that exists
 *   - no template placeholder survives into a published page
 *   - JSON data files parse and reference real articles
 *   - tag balance on generated pages
 * Exit code is non-zero on any failure, so it can gate a commit or a workflow.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const notes = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(ROOT);
const html = files.filter((f) => f.endsWith('.html'));

/* ---------- link + asset resolution ---------- */
const EXTERNAL_OK = /^(https?:|mailto:|tel:|data:|#)/i;

function targetExists(baseDir, raw) {
  let path = raw.split('#')[0].split('?')[0].replace(/\/+$/, '');
  if (!path) return true;
  if (path.startsWith('/')) {
    const rel = path.slice(1);
    return existsSync(join(ROOT, rel)) || existsSync(join(ROOT, rel, 'index.html'));
  }
  const abs = resolve(baseDir, path);
  return existsSync(abs) || existsSync(join(abs, 'index.html'));
}

/* Comments are not markup: the publish contract only cares about them inside
   _template-post.html, which the agent strips before writing an article. */
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');

for (const file of html) {
  const text = stripComments(readFileSync(file, 'utf8'));
  const baseDir = dirname(file);
  const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');

  for (const m of text.matchAll(/(?:href|src|action)="([^"]+)"/g)) {
    const raw = m[1];
    if (EXTERNAL_OK.test(raw)) continue;
    if (!targetExists(baseDir, raw)) failures.push(`${rel}: 指向不存在的路径 ${raw}`);
  }

  for (const m of text.matchAll(/url\("?([^")]+)"?\)/g)) {
    const raw = m[1];
    if (EXTERNAL_OK.test(raw)) continue;
    if (!targetExists(baseDir, raw)) failures.push(`${rel}: CSS url() 指向不存在的路径 ${raw}`);
  }

  /* ---------- placeholders that must never ship ---------- */
  for (const token of ['【文章标题】', '【一句话副标题】', '【标签1', '【分类，比如', 'X min', 'hello@example.com']) {
    if (text.includes(token) && !rel.startsWith('_template')) {
      failures.push(`${rel}: 仍留有占位符「${token}」`);
    }
  }

  /* ---------- balance of the containers we generate ---------- */
  for (const tag of ['div', 'section', 'article', 'main', 'header', 'footer', 'ul', 'table']) {
    const open = (text.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const close = (text.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (open !== close) failures.push(`${rel}: <${tag}> 开合不平衡（${open} / ${close}）`);
  }
}

/* ---------- publish contract markers (comments included: the agent reads raw) ---------- */
for (const page of ['create.html', 'observe.html', 'archives/index.html']) {
  const raw = readFileSync(join(ROOT, page), 'utf8');
  const n = raw.split('<section class="entry-list">').length - 1;
  if (n !== 1) failures.push(`${page}: 发布标记 <section class="entry-list"> 出现 ${n} 次，必须恰好 1 次`);
}

/* ---------- data integrity ---------- */
const projects = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8'));
const site = JSON.parse(readFileSync(join(ROOT, 'data/site.json'), 'utf8'));

if (!Array.isArray(projects)) failures.push('data/projects.json 不是数组');
if (!site.email) failures.push('data/site.json 缺少 email');

/* ---------- contacts: one source of truth, no misleading labels ---------- */
const contacts = site.contacts || [];
if (contacts.length < 2) failures.push('data/site.json 需要 Personal 与 Business 两个联系方式');
for (const c of contacts) {
  for (const field of ['key', 'en', 'zh', 'scope', 'email']) {
    if (!c[field]) failures.push(`contacts.${c.key || '?'}: 缺少字段 ${field}`);
  }
  if (c.key === 'personal' && c.email !== site.email) {
    failures.push('contacts.personal 与站点 email 不一致');
  }
  const inAbout = readFileSync(join(ROOT, 'about.html'), 'utf8');
  if (!inAbout.includes(`mailto:${c.email}`)) failures.push(`about.html 缺少 ${c.email} 的 mailto 链接`);
  if (!inAbout.includes(`data-copy="${c.email}"`)) failures.push(`about.html 缺少 ${c.email} 的复制按钮`);
}
const contactPages = ['about.html', 'index.html', 'orbit/index.html'];
for (const page of contactPages) {
  const text = readFileSync(join(ROOT, page), 'utf8');
  for (const bad of ['官方商务邮箱', '企业邮箱', '商务专用', '私人邮箱', '工作室邮箱']) {
    if (text.includes(bad)) failures.push(`${page}: 联系方式使用了容易误解的称呼「${bad}」`);
  }
}

const allEntries = new Map();
for (const page of ['create.html', 'observe.html', 'archives/index.html']) {
  const text = readFileSync(join(ROOT, page), 'utf8');
  for (const m of text.matchAll(/<a href="(\/\d{4}\/\d{2}\/\d{2}\/[^"]+)" class="entry">([\s\S]*?)<\/a>/g)) {
    allEntries.set(m[1], m[2]);
  }
}

/* ---------- fragments: a curated sentence must be verbatim in its source ---------- */
const fragCfg = site.fragments || {};

function leafText(file) {
  const raw = readFileSync(file, 'utf8');
  const out = [];
  for (const m of raw.matchAll(/<(p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/g)) {
    out.push(m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  }
  return out;
}

for (const c of fragCfg.curated || []) {
  const text = String(c.text || '').trim();
  if (!text) { failures.push('fragments.curated: 有空条目'); continue; }
  if (!c.from) {
    if (!c.date) failures.push(`fragments.curated: 独立碎片「${text.slice(0, 18)}…」需要写 date`);
    continue;
  }
  const file = join(ROOT, c.from.replace(/^\/+/, '').replace(/\/+$/, ''), 'index.html');
  if (!existsSync(file)) {
    failures.push(`fragments.curated: 出处页面不存在 ${c.from}`);
  } else if (!leafText(file).some((t) => t.includes(text))) {
    failures.push(`fragments.curated: 「${text.slice(0, 24)}…」并非 ${c.from} 的原文，不能冒充原话`);
  }
  if (!allEntries.has(c.from)) failures.push(`fragments.curated: 出处 ${c.from} 不在任何文章列表中`);
}

notes.push(`fragments: ${(fragCfg.curated || []).length} 条人工摘录已逐字核对`);

for (const p of projects) {
  const page = join(ROOT, 'projects', p.slug, 'index.html');
  if (!existsSync(page)) failures.push(`缺少项目详情页：/projects/${p.slug}/（运行 node tools/gen-projects.mjs）`);
  for (const href of p.related || []) {
    if (!allEntries.has(href)) failures.push(`${p.slug}: related 指向不在列表中的文章 ${href}`);
  }
  for (const field of ['name', 'status', 'tagline', 'language', 'since', 'updated', 'repo']) {
    if (!p[field]) failures.push(`${p.slug}: 缺少字段 ${field}`);
  }
  if (!(p.stars >= 0) || !(p.forks >= 0)) failures.push(`${p.slug}: star/fork 数值缺失，页面不应猜测指标`);
}

/* ---------- feeds ---------- */
for (const feed of ['feed.xml', 'sitemap.xml']) {
  if (!existsSync(join(ROOT, feed))) { failures.push(`缺少 ${feed}（运行 node tools/gen-feeds.mjs）`); continue; }
  const text = readFileSync(join(ROOT, feed), 'utf8');
  const open = (text.match(/<item>|<url>/g) || []).length;
  const close = (text.match(/<\/item>|<\/url>/g) || []).length;
  if (open !== close) failures.push(`${feed}: 条目开合不平衡`);
  notes.push(`${feed}: ${open} 条`);
}

/* ---------- report ---------- */
notes.unshift(`html pages: ${html.length}`, `articles indexed: ${allEntries.size}`, `projects: ${projects.length}`);

if (failures.length) {
  console.error(`FAIL (${failures.length})`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`OK — ${notes.join(' · ')}`);
