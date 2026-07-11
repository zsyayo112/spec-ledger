#!/usr/bin/env node
// validate-repo.mjs — structural checks for the spec-ledger repo itself.
// Runs in CI and before releases: node scripts/validate-repo.mjs
// Exits 1 with a problem list on any violation.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const err = (m) => errors.push(m);

// --- plugin manifest
let plugin = {};
try {
  plugin = JSON.parse(readFileSync(join(ROOT, '.claude-plugin/plugin.json'), 'utf8'));
  if (!plugin.name) err('plugin.json: missing name');
  if (!/^\d+\.\d+\.\d+$/.test(plugin.version ?? '')) err('plugin.json: version is not semver');
  if (!plugin.description) err('plugin.json: missing description');
} catch (e) {
  err(`plugin.json: ${e.message}`);
}

// --- marketplace manifest (optional, but must be consistent when present)
const mpPath = join(ROOT, '.claude-plugin/marketplace.json');
if (existsSync(mpPath)) {
  try {
    const mp = JSON.parse(readFileSync(mpPath, 'utf8'));
    if (!mp.name) err('marketplace.json: missing name');
    if (!Array.isArray(mp.plugins) || mp.plugins.length === 0) {
      err('marketplace.json: plugins array is missing or empty');
    } else if (!mp.plugins.some((p) => p.name === plugin.name)) {
      err(`marketplace.json: no plugin entry named "${plugin.name}"`);
    }
  } catch (e) {
    err(`marketplace.json: ${e.message}`);
  }
}

// --- skills: SKILL.md present, frontmatter sane, name matches directory
for (const dir of readdirSync(join(ROOT, 'skills'))) {
  const path = join(ROOT, 'skills', dir, 'SKILL.md');
  if (!existsSync(path)) {
    err(`skills/${dir}: missing SKILL.md`);
    continue;
  }
  const text = readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) {
    err(`skills/${dir}/SKILL.md: missing frontmatter`);
    continue;
  }
  const name = fm[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const desc = fm[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (name !== dir) err(`skills/${dir}/SKILL.md: name "${name}" does not match directory name`);
  if (!desc) err(`skills/${dir}/SKILL.md: missing description`);
  else if (desc.length > 1024) err(`skills/${dir}/SKILL.md: description over 1024 chars`);
  const lines = text.split('\n').length;
  if (lines > 500) err(`skills/${dir}/SKILL.md: ${lines} lines (keep under 500)`);
}

// --- files the docs promise must exist
for (const p of [
  'skills/spec/scripts/spec-status.mjs',
  'skills/spec/scripts/test/run.mjs',
  'skills/spec/references/spec-template.md',
  'CHANGELOG.md',
]) {
  if (!existsSync(join(ROOT, p))) err(`missing file referenced by docs: ${p}`);
}

if (errors.length) {
  console.error(`validate-repo: ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('validate-repo: OK');
