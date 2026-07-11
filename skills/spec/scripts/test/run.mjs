#!/usr/bin/env node
// run.mjs — smoke tests for spec-status.mjs. Zero dependencies.
//
// Usage: node skills/spec/scripts/test/run.mjs
//
// Builds throwaway fixture projects in the OS temp dir (generated at runtime
// so git line-ending normalization can't corrupt the CRLF case), runs the
// audit script against them, and asserts on messages and exit codes.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'spec-status.mjs');
const TODAY = new Date().toISOString().slice(0, 10);
const JIRA_CONFIG = JSON.stringify({ specsDir: 'specs', ticketPattern: '[A-Z]+-\\d+' });

const roots = [];
let passed = 0;
let failed = 0;

function project({ config, specs }) {
  const root = mkdtempSync(join(tmpdir(), 'spec-ledger-test-'));
  roots.push(root);
  if (config !== undefined) writeFileSync(join(root, '.specledger.json'), config);
  mkdirSync(join(root, 'specs'));
  for (const [name, content] of Object.entries(specs ?? {})) {
    writeFileSync(join(root, 'specs', name), content);
  }
  return root;
}

function run(cwd, ...cliArgs) {
  const r = spawnSync(process.execPath, [SCRIPT, ...cliArgs], { cwd, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

function check(name, cond, output) {
  if (cond) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}\n  ${(output ?? '').trim().split('\n').join('\n  ')}`);
    failed++;
  }
}

const spec = (fm, body = '# t\n') => `---\n${fm}\n---\n\n${body}`;

try {
  // --- clean ledger: everything legal must pass, incl. CRLF and inline # comments
  const clean = project({
    config: JIRA_CONFIG,
    specs: {
      'CAN-1-crlf-done.md': spec(
        'ticket: CAN-1\nstatus: done\nupdated: 2026-07-01\ndecisions_resolved: true  # all signed off',
        '# t\n\n## Closeout — 2026-07-01\n'
      ).replace(/\n/g, '\r\n'),
      'CAN-2-old-way.md': spec(
        'ticket: CAN-2\nstatus: superseded\nsuperseded_by: CAN-3-new-way\nupdated: 2026-07-01'
      ),
      'CAN-3-new-way.md': spec('ticket: CAN-3\nstatus: draft\ncreated: 2026-07-01'),
      'CAN-4-dropped-idea.md': spec('ticket: CAN-4\nstatus: abandoned\nupdated: 2026-07-01'),
      'CAN-5-fresh-work.md': spec(
        `ticket: CAN-5\nstatus: in-progress\nupdated: ${TODAY}\ndecisions_resolved: true`
      ),
    },
  });
  const cleanRun = run(clean, '--ci');
  check('clean ledger passes --ci (exit 0)', cleanRun.code === 0, cleanRun.out);
  check('clean ledger reports no violations', cleanRun.out.includes('No violations'), cleanRun.out);
  check('CRLF frontmatter is parsed', cleanRun.out.includes('CAN-1'), cleanRun.out);
  check(
    'specsDir is read from .specledger.json (no dir arg)',
    cleanRun.out.includes('CAN-5-fresh-work.md'),
    cleanRun.out
  );

  // --- github-style quoted ticket ids
  const gh = project({
    config: JSON.stringify({ specsDir: 'specs', ticketPattern: '#\\d+' }),
    specs: { '12-add-dark-mode.md': spec('ticket: "#12"\nstatus: draft\ncreated: 2026-07-01') },
  });
  const ghRun = run(gh, '--ci');
  check(
    'quoted "#12" ticket matches "#\\d+" pattern',
    ghRun.code === 0 && ghRun.out.includes('No violations'),
    ghRun.out
  );

  // --- violations ledger: every check must fire
  const bad = project({
    config: JIRA_CONFIG,
    specs: {
      'CAN-10.md': spec('ticket: CAN-10\nstatus: draft\ncreated: 2026-07-01'),
      'no-frontmatter.md': '# just a heading\n',
      'CAN-11-bad-status.md': spec('ticket: CAN-11\nstatus: shipped\nupdated: 2026-07-01'),
      'CAN-12-no-ticket.md': spec('status: draft\ncreated: 2026-07-01'),
      'CAN-13-bad-ticket.md': spec('ticket: lowercase-slug\nstatus: draft\ncreated: 2026-07-01'),
      'CAN-14-dup-a.md': spec('ticket: CAN-14\nstatus: draft\ncreated: 2026-07-01'),
      'CAN-14-dup-b.md': spec(
        `ticket: CAN-14\nstatus: in-progress\nupdated: ${TODAY}\ndecisions_resolved: true`
      ),
      'CAN-15-dangling.md': spec(
        'ticket: CAN-15\nstatus: superseded\nsuperseded_by: no-such-spec\nupdated: 2026-07-01'
      ),
      'CAN-16-empty-supersede.md': spec('ticket: CAN-16\nstatus: superseded\nupdated: 2026-07-01'),
      'CAN-17-live-with-ref.md': spec(
        'ticket: CAN-17\nstatus: draft\nsuperseded_by: CAN-10\ncreated: 2026-07-01'
      ),
      'CAN-18-done-bare.md': spec('ticket: CAN-18\nstatus: done\nupdated: 2026-07-01'),
      'CAN-19-stale.md': spec(
        'ticket: CAN-19\nstatus: in-progress\nupdated: 2020-01-01\ndecisions_resolved: true'
      ),
      'CAN-20-unsigned.md': spec(
        `ticket: CAN-20\nstatus: in-progress\nupdated: ${TODAY}\ndecisions_resolved: false`
      ),
      'CAN-21-half-dead.md': spec(
        'ticket: CAN-21\nstatus: abandoned\nsuperseded_by: CAN-10\nupdated: 2026-07-01'
      ),
    },
  });
  const badRun = run(bad, '--ci');
  check('violations ledger fails --ci (exit 1)', badRun.code === 1, badRun.out);
  const expected = [
    ['no-slug filename flagged', 'CAN-10.md: filename has no descriptive slug'],
    ['missing frontmatter flagged', 'no-frontmatter.md: missing frontmatter'],
    ['unknown status flagged', 'unknown status "shipped"'],
    ['missing ticket flagged', 'CAN-12-no-ticket.md: missing ticket'],
    ['ticket pattern mismatch flagged', '"lowercase-slug" does not match'],
    ['duplicate live specs flagged', 'ticket CAN-14 has 2 live specs'],
    ['dangling superseded_by flagged', '"no-such-spec" does not match any spec'],
    [
      'superseded without superseded_by flagged',
      'CAN-16-empty-supersede.md: superseded but superseded_by is empty',
    ],
    ['superseded_by on a live spec flagged', 'CAN-17-live-with-ref.md: superseded_by set'],
    ['done without Closeout flagged', 'CAN-18-done-bare.md: done but has no Closeout'],
    ['stale in-progress flagged', 'CAN-19-stale.md: in-progress but not updated in'],
    ['work before sign-off flagged', 'decisions_resolved is false'],
    ['abandoned with superseded_by flagged', 'CAN-21-half-dead.md: superseded_by set'],
  ];
  for (const [name, needle] of expected) check(name, badRun.out.includes(needle), badRun.out);

  // --- broken config must fail loudly, not silently audit the wrong dir
  const broken = project({ config: '{ this is not json', specs: {} });
  const brokenRun = run(broken, '--ci');
  check(
    'malformed .specledger.json exits 2',
    brokenRun.code === 2 && brokenRun.out.includes('.specledger.json'),
    brokenRun.out
  );

  // --- bad flags and missing dir
  const flagRun = run(clean, '--stale-days', 'soon');
  check('non-numeric --stale-days exits 2', flagRun.code === 2, flagRun.out);
  const missRun = run(clean, 'no-such-dir');
  check(
    'missing specs dir exits 2',
    missRun.code === 2 && missRun.out.includes('cannot read directory'),
    missRun.out
  );
} finally {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
