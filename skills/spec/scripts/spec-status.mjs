#!/usr/bin/env node
// spec-status.mjs — audit a specs directory for lifecycle violations.
//
// Usage: node spec-status.mjs [specsDir] [--stale-days N] [--ci]
//   specsDir      directory containing spec .md files
//                 (default: "specsDir" from ./.specledger.json, else docs/specs)
//   --stale-days  flag in-progress specs not updated in N days (default: 14)
//   --ci          exit 1 when violations are found
//
// Reads ./.specledger.json when present: specsDir (default dir) and
// ticketPattern (validates each spec's ticket field).

import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const STATUSES = ['draft', 'pending-decisions', 'in-progress', 'done', 'superseded'];
const SKIP = new Set(['README.md', 'TEMPLATE.md']);
const CLOSEOUT_RE = /^##\s+(Closeout|收口)/m;
// Filename that is only a ticket id (e.g. E5-1.md, CAN-69.md, 123.md) — no descriptive slug.
const NO_SLUG_RE = /^(?:[A-Za-z]+\d*-)?\d+[a-z]?$/;

const args = process.argv.slice(2);
const ci = args.includes('--ci');
const staleIdx = args.indexOf('--stale-days');
const staleDays = staleIdx >= 0 ? Number(args[staleIdx + 1]) : 14;

let config = {};
try {
  config = JSON.parse(readFileSync('.specledger.json', 'utf8'));
} catch {
  // no config — fall back to defaults
}

const dir =
  args.find((a, i) => !a.startsWith('--') && (staleIdx < 0 || i !== staleIdx + 1)) ??
  config.specsDir ??
  'docs/specs';

let ticketRe = null;
if (typeof config.ticketPattern === 'string' && config.ticketPattern) {
  try {
    ticketRe = new RegExp(`^(?:${config.ticketPattern})$`);
  } catch {
    console.error(`spec-status: ignoring invalid ticketPattern "${config.ticketPattern}"`);
  }
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const fm = {};
  for (const line of text.slice(4, end).split('\n')) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].replace(/\s+#.*$/, '').replace(/^["']|["']$/g, '').trim();
  }
  return fm;
}

function daysSince(dateStr) {
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86_400_000);
}

let files;
try {
  files = readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !SKIP.has(f) && !f.startsWith('.') && !f.startsWith('_'))
    .sort();
} catch (e) {
  console.error(`spec-status: cannot read directory "${dir}": ${e.message}`);
  process.exit(2);
}

const rows = [];
const violations = [];
const flag = (file, msg) => violations.push({ file, msg });
const specNames = new Set(files.map((f) => basename(f, '.md')));
const ticketFiles = new Map(); // ticket -> non-superseded spec files
const supersededRefs = []; // { file, ref } to verify after all names are known

for (const file of files) {
  const text = readFileSync(join(dir, file), 'utf8').replace(/\r\n?/g, '\n');
  const fm = parseFrontmatter(text);
  const name = basename(file, '.md');

  if (NO_SLUG_RE.test(name)) flag(file, 'filename has no descriptive slug');

  if (!fm) {
    rows.push({ file, ticket: '—', status: 'no-frontmatter', updated: '—' });
    flag(file, 'missing frontmatter');
    continue;
  }

  const status = fm.status ?? '';
  const updated = fm.updated || fm.created || '';
  const superseded_by = fm.superseded_by && fm.superseded_by !== 'null' ? fm.superseded_by : null;
  rows.push({ file, ticket: fm.ticket || '—', status: status || '—', updated: updated || '—' });

  if (!fm.ticket) flag(file, 'missing ticket in frontmatter');
  else if (ticketRe && !ticketRe.test(fm.ticket)) {
    flag(file, `ticket "${fm.ticket}" does not match configured ticketPattern`);
  }
  if (fm.ticket && status !== 'superseded') {
    const list = ticketFiles.get(fm.ticket) ?? [];
    list.push(file);
    ticketFiles.set(fm.ticket, list);
  }
  if (status === 'superseded' && superseded_by) supersededRefs.push({ file, ref: superseded_by });

  if (!STATUSES.includes(status)) {
    flag(file, status ? `unknown status "${status}"` : 'missing status');
    continue;
  }

  if (status === 'in-progress') {
    const age = updated ? daysSince(updated) : null;
    if (age === null) flag(file, 'in-progress but no parseable updated/created date');
    else if (age > staleDays) flag(file, `in-progress but not updated in ${age} days (threshold ${staleDays})`);
  }
  if (status === 'done' && !CLOSEOUT_RE.test(text)) {
    flag(file, 'done but has no Closeout section (was acceptance actually run?)');
  }
  if (fm.decisions_resolved === 'false' && (status === 'in-progress' || status === 'done')) {
    flag(file, `status "${status}" but decisions_resolved is false — work started before sign-off`);
  }
  if (status === 'superseded' && !superseded_by) flag(file, 'superseded but superseded_by is empty');
  if (status !== 'superseded' && superseded_by) {
    flag(file, `superseded_by set ("${superseded_by}") but status is "${status}"`);
  }
}

for (const { file, ref } of supersededRefs) {
  if (!specNames.has(basename(ref, '.md'))) {
    flag(file, `superseded_by "${ref}" does not match any spec in ${dir}`);
  }
}
for (const [ticket, list] of ticketFiles) {
  if (list.length > 1) {
    flag(list[0], `ticket ${ticket} has ${list.length} non-superseded specs: ${list.join(', ')}`);
  }
}

// --- report ---
const order = (s) => (STATUSES.indexOf(s) + 1 || 99);
rows.sort((a, b) => order(a.status) - order(b.status) || a.file.localeCompare(b.file));

const w = {
  ticket: Math.max(6, ...rows.map((r) => r.ticket.length)),
  status: Math.max(6, ...rows.map((r) => r.status.length)),
  updated: Math.max(7, ...rows.map((r) => r.updated.length)),
};
console.log(
  `${'TICKET'.padEnd(w.ticket)}  ${'STATUS'.padEnd(w.status)}  ${'UPDATED'.padEnd(w.updated)}  FILE`
);
for (const r of rows) {
  console.log(
    `${r.ticket.padEnd(w.ticket)}  ${r.status.padEnd(w.status)}  ${r.updated.padEnd(w.updated)}  ${r.file}`
  );
}

const counts = {};
for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
console.log(
  `\n${rows.length} specs — ` +
    Object.entries(counts).map(([s, n]) => `${s}: ${n}`).join(', ')
);

if (violations.length) {
  console.log(`\n${violations.length} violation(s):`);
  for (const v of violations) console.log(`  ${v.file}: ${v.msg}`);
} else {
  console.log('\nNo violations.');
}

process.exit(ci && violations.length ? 1 : 0);
