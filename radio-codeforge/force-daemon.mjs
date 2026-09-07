#!/usr/bin/env node

import { appendFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const configPath = join(root, 'radio-codeforge', 'radio-codeforge.config.json');

function fail(message) {
  console.error(`RADIO_CODEFORGE_FORCE=FAIL ${message}`);
  process.exitCode = 1;
}

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

if (!existsSync(configPath)) {
  fail('missing radio-codeforge configuration');
  process.exit();
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const violations = [];
const findings = [];
const recommendations = [];

if (config.runtimeIntegration !== false) violations.push('runtimeIntegration must remain false');
if (config.sourceMutationAuthority !== false) violations.push('sourceMutationAuthority must remain false');
if (config.deploymentMutationAuthority !== false) violations.push('deploymentMutationAuthority must remain false');
if (config.pfsMutationAuthority !== false) violations.push('pfsMutationAuthority must remain false');
if (config.activeDevelopmentAssistance !== true) violations.push('activeDevelopmentAssistance must remain true');

const textExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.scss', '.md', '.yml', '.yaml', '.toml']);
const trackedFiles = git(['ls-files']).split('\n').filter(Boolean);

for (const runtimeRoot of config.forbiddenRuntimeRoots ?? []) {
  const prefix = `${runtimeRoot}/`;
  for (const file of trackedFiles) {
    if (!file.startsWith(prefix)) continue;
    const fullPath = join(root, file);
    if (!existsSync(fullPath) || !statSync(fullPath).isFile()) continue;
    if (!textExtensions.has(extname(file).toLowerCase())) continue;

    let content;
    try {
      content = readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    for (const pattern of config.forbiddenRuntimeReferencePatterns ?? []) {
      if (content.includes(pattern)) {
        violations.push(`${file} references development-only Radio-CodeForge path/token: ${pattern}`);
      }
    }
  }
}

const branch = git(['branch', '--show-current'], process.env.GITHUB_REF_NAME ?? 'UNKNOWN');
const commit = git(['rev-parse', 'HEAD'], process.env.GITHUB_SHA ?? 'UNKNOWN');
const baseRef = process.env.GITHUB_BASE_REF || '';
const diffRange = baseRef && git(['rev-parse', '--verify', `origin/${baseRef}`])
  ? `origin/${baseRef}...HEAD`
  : git(['rev-parse', '--verify', 'HEAD^'])
    ? 'HEAD^...HEAD'
    : '';
const changedNames = diffRange
  ? git(['diff', '--name-only', diffRange]).split('\n').filter(Boolean)
  : [];

const developmentDomains = {
  player: ['public/', 'src/', 'assets/', '666SOUNDsDESIGn/'],
  workers: ['workers/', 'functions/'],
  deployment: ['.github/workflows/', 'wrangler', 'scripts/verify-deployment'],
  tests: ['tests/'],
  configuration: ['package.json', 'wrangler.toml', 'wrangler.json', 'wrangler.jsonc']
};

const touchedDomains = [];
for (const [domain, prefixes] of Object.entries(developmentDomains)) {
  if (changedNames.some((file) => prefixes.some((prefix) => file === prefix || file.startsWith(prefix)))) {
    touchedDomains.push(domain);
  }
}

const productionChanges = changedNames.filter((file) =>
  (config.radioProductionRoots ?? []).some((rootName) => file === rootName || file.startsWith(`${rootName}/`))
);
const testChanges = changedNames.filter((file) => file.startsWith('tests/'));
const workflowChanges = changedNames.filter((file) => file.startsWith('.github/workflows/'));

if (productionChanges.length) {
  findings.push(`production code touched: ${productionChanges.length} file(s)`);
  if (!testChanges.length) {
    recommendations.push('Production code changed without a test-file change; verify whether regression coverage must be added or an existing test already proves the behavior.');
  }
}

if (workflowChanges.length) {
  findings.push(`deployment/workflow topology touched: ${workflowChanges.length} file(s)`);
  recommendations.push('Workflow/deployment files changed; verify branch routing, permissions, secrets/bindings, deployment target and post-deploy readback before promotion.');
}

if (touchedDomains.includes('workers')) {
  recommendations.push('Worker/function changes detected; validate route ownership, CORS, bindings, cache behavior and frontend/worker deployment separation.');
}

if (touchedDomains.includes('player')) {
  recommendations.push('Player/UI changes detected; validate audio state continuity, metadata, reconnect behavior, responsive layout and regression tests across affected players.');
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const requiredScript of ['check', 'test', 'verify']) {
  if (!packageJson.scripts?.[requiredScript]) violations.push(`package.json missing required script: ${requiredScript}`);
}
if (!packageJson.scripts?.['radio:codeforge']) violations.push('package.json missing radio:codeforge force binding');

const capabilities = config.activeCapabilities ?? [];
for (const required of ['develop-assist', 'audit', 'verify', 'improve', 'evolve', 'continuity']) {
  if (!capabilities.includes(required)) violations.push(`missing active capability: ${required}`);
}

const finalRecommendations = unique(recommendations);
const finalFindings = unique(findings);

console.log(`RADIO_CODEFORGE_SYSTEM=${config.systemId}`);
console.log('RADIO_CODEFORGE_MODE=ACTIVE_PARALLEL_DEVELOPMENT_ASSISTANT');
console.log('RADIO_CODEFORGE_RUNTIME_INFILTRATION=FORBIDDEN');
console.log('RADIO_CODEFORGE_MUTATION_AUTHORITY=NONE');
console.log(`RADIO_CODEFORGE_BRANCH=${branch || 'DETACHED'}`);
console.log(`RADIO_CODEFORGE_COMMIT=${commit}`);
console.log(`RADIO_CODEFORGE_DIFF_RANGE=${diffRange || 'UNAVAILABLE'}`);
console.log(`RADIO_CODEFORGE_CHANGED_FILES=${changedNames.length}`);
console.log(`RADIO_CODEFORGE_DOMAINS=${touchedDomains.join(',') || 'NONE'}`);
console.log(`RADIO_CODEFORGE_FINDINGS=${finalFindings.length}`);
console.log(`RADIO_CODEFORGE_RECOMMENDATIONS=${finalRecommendations.length}`);
for (const finding of finalFindings) console.log(`RADIO_CODEFORGE_FINDING=${finding}`);
for (const recommendation of finalRecommendations) console.log(`RADIO_CODEFORGE_RECOMMENDATION=${recommendation}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = [
    '# 666 RADIO-CODEFORGE — Active Development Audit',
    '',
    `- Commit: \`${commit}\``,
    `- Branch: \`${branch || 'DETACHED'}\``,
    `- Changed files: **${changedNames.length}**`,
    `- Touched domains: **${touchedDomains.join(', ') || 'none'}**`,
    `- Runtime infiltration: **FORBIDDEN**`,
    `- Source mutation authority: **NONE**`,
    '',
    '## Findings',
    ...(finalFindings.length ? finalFindings.map((item) => `- ${item}`) : ['- No development-risk findings.']),
    '',
    '## Development recommendations',
    ...(finalRecommendations.length ? finalRecommendations.map((item) => `- ${item}`) : ['- No additional recommendation for this delta.']),
    '',
    '## Isolation',
    violations.length ? `- FAIL: ${violations.length} violation(s)` : '- PASS: Radio-CodeForge remains outside radio runtime.',
    ''
  ].join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8');
}

if (violations.length) {
  for (const violation of violations) console.error(`RADIO_CODEFORGE_VIOLATION=${violation}`);
  fail(`${violations.length} force contract violation(s)`);
} else {
  console.log('RADIO_CODEFORGE_ACTIVE_ASSISTANCE=PASS');
  console.log('RADIO_CODEFORGE_ISOLATION=PASS');
  console.log('RADIO_CODEFORGE_FORCE=PASS');
}
