/*
 * tools/sync-github.mjs
 * Refreshes the observable facts in data/projects.json from GitHub.
 *
 *   node tools/sync-github.mjs            # fetch and write
 *   node tools/sync-github.mjs --dry-run  # fetch and report only
 *
 * Scope is deliberately narrow: stars, forks, license, last push date and
 * whether the repository is public. Repository topics are *not* copied over —
 * GitHub lets anyone tag a repo, while the topics here decide the tag pages and
 * the star field, so they stay curated by hand. Every sentence on a project
 * page stays hand-written, because a generated summary is something I cannot
 * be held to.
 *
 * Private repositories are read through the `gh` CLI when it is available and
 * authorised; their visibility is recorded so the generated page never links a
 * visitor to a 404. Nothing is written when a request fails — a rate limit or
 * an offline machine must not turn into a page that claims the repository
 * disappeared. Set GITHUB_TOKEN to raise the REST limit from 60 to 5000/hour.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS_FILE = join(ROOT, 'data', 'projects.json');
const SITE_FILE = join(ROOT, 'data', 'site.json');
const DRY_RUN = process.argv.includes('--dry-run');
const TOKEN = process.env.GITHUB_TOKEN || '';
const GAP = 120; // ms between calls, so 10 repos cost ~1 request/second

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ownerRepo(url) {
  const m = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/i.exec(String(url || ''));
  if (!m) return null;
  return { owner: m[1], name: m[2].replace(/\.git$/i, '') };
}

async function fetchRepo(ref) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'tance-mang.github.io project sync'
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.name}`, {
    headers,
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const d = await res.json();
  return {
    pushedAt: d.pushed_at,
    stargazerCount: d.stargazers_count,
    forkCount: d.forks_count,
    spdxId: d.license && d.license.spdx_id,
    visibility: d.private ? 'private' : 'public'
  };
}

function ghRepo(ref) {
  return new Promise((resolveP, rejectP) => {
    // `license` is not among the fields this gh build exposes, so a private
    // repository keeps the licence line that was written by hand.
    execFile('gh', ['repo', 'view', `${ref.owner}/${ref.name}`, '--json',
      'pushedAt,stargazerCount,forkCount,visibility'],
    { timeout: 20000 }, (err, stdout) => {
      if (err) return rejectP(new Error(String(err.message).split('\n')[0]));
      try {
        const d = JSON.parse(stdout);
        resolveP({
          pushedAt: d.pushedAt,
          stargazerCount: d.stargazerCount,
          forkCount: d.forkCount,
          spdxId: undefined,
          visibility: String(d.visibility || '').toLowerCase() === 'private' ? 'private' : 'public'
        });
      } catch (e) {
        rejectP(e);
      }
    });
  });
}

const today = new Date().toISOString().slice(0, 10);
const projects = JSON.parse(readFileSync(PROJECTS_FILE, 'utf8'));
const rows = [];
let changed = 0;
let ok = 0;

for (let i = 0; i < projects.length; i++) {
  const p = projects[i];
  const ref = ownerRepo(p.repo);
  if (!ref) {
    rows.push(`  ! ${p.slug}  repo url not recognised: ${p.repo}`);
    continue;
  }
  if (i) await sleep(GAP);
  let data, via = 'rest';
  try {
    data = await fetchRepo(ref);
    ok++;
  } catch (err) {
    // A 404 on the public endpoint usually means the repository is private.
    try {
      data = await ghRepo(ref);
      via = 'gh (private)';
      ok++;
    } catch {
      rows.push(`  ! ${p.slug}  kept previous values (${err.message})`);
      continue;
    }
  }

  const license = data.spdxId && data.spdxId !== 'NOASSERTION' ? data.spdxId : p.license;
  const next = {
    ...p,
    visibility: data.visibility || p.visibility,
    updated: (data.pushedAt || p.updated || '').slice(0, 10),
    stars: Number.isFinite(data.stargazerCount) ? data.stargazerCount : p.stars,
    forks: Number.isFinite(data.forkCount) ? data.forkCount : p.forks,
    license
  };
  const diff = ['visibility', 'updated', 'stars', 'forks', 'license']
    .filter((k) => String(next[k]) !== String(p[k]))
    .map((k) => `${k}: ${p[k]} → ${next[k]}`);
  if (diff.length) {
    changed++;
    projects[i] = next;
    rows.push(`  · ${p.slug}  via ${via}  ${diff.join(', ')}`);
  } else {
    rows.push(`  = ${p.slug}  unchanged (via ${via})`);
  }
}

if (!DRY_RUN && changed) {
  writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2) + '\n', 'utf8');
  const site = JSON.parse(readFileSync(SITE_FILE, 'utf8'));
  site.observed = today;
  writeFileSync(SITE_FILE, JSON.stringify(site, null, 2) + '\n', 'utf8');
}

console.log(`github sync ${DRY_RUN ? '(dry run)' : ''} — ${ok}/${projects.length} repositories reached, ${changed} record(s) would change${DRY_RUN || !changed ? '' : ', written'}${!DRY_RUN && changed ? `, observed ${today}` : ''}`);
console.log(rows.join('\n'));
process.exit(ok === projects.length ? 0 : 2);
