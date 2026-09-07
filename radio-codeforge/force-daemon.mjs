#!/usr/bin/env node

import { appendFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const configPath = join(root, 'radio-codeforge', 'radio-codeforge.config.json');
const learningProfilePath = join(root, 'radio-codeforge', 'learning-profile.json');

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
if (!existsSync(learningProfilePath)) {
  fail('missing radio-codeforge learning profile');
  process.exit();
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const learningProfile = JSON.parse(readFileSync(learningProfilePath, 'utf8'));
const violations = [];
const findings = [];
const recommendations = [];

if (config.runtimeIntegration !== false) violations.push('runtimeIntegration must remain false');
if (config.sourceMutationAuthority !== false) violations.push('sourceMutationAuthority must remain false');
if (config.deploymentMutationAuthority !== false) violations.push('deploymentMutationAuthority must remain false');
if (config.pfsMutationAuthority !== false) violations.push('pfsMutationAuthority must remain false');
if (config.activeDevelopmentAssistance !== true) violations.push('activeDevelopmentAssistance must remain true');

if (config.learningSource?.system !== '666CODEFORGE') violations.push('learning source must remain 666CODEFORGE');
if (config.learningSource?.mode !== 'learn-and-adapt-only') violations.push('learning mode must remain learn-and-adapt-only');
for (const field of ['identityImport', 'triggerImport', 'authorityImport', 'namespaceImport']) {
  if (config.learningSource?.[field] !== false) violations.push(`learning boundary ${field} must remain false`);
}

if (learningProfile.learningMode !== 'capability-adaptation-only') violations.push('learning profile must remain capability-adaptation-only');
for (const [key, value] of Object.entries(learningProfile.identityBoundary ?? {})) {
  if (value !== false) violations.push(`learning profile identity boundary ${key} must remain false`);
}

const codex = config.codexEscalation ?? {};
if (codex.enabled !== true) violations.push('Codex escalation must remain enabled');
if (codex.automaticProductionAuthority !== false) violations.push('Codex production authority must remain false');
if (codex.automaticSourceMutationAuthority !== false) violations.push('Codex source mutation authority must remain false');
if (codex.hostOrChatRoutingRequired !== true) violations.push('Codex escalation must require host/chat routing');
if (codex.resultMustBeReviewedByRadioCodeForge !== true) violations.push('Codex result must require Radio-CodeForge review');
if (codex.resultMustPassRadioAuditBeforePromotion !== true) violations.push('Codex result must pass Radio-CodeForge audit before promotion');

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
for (const required of [
  'develop-assist', 'audit', 'verify', 'improve', 'evolve', 'continuity',
  'root-cause-analysis', 'repository-topology-analysis', 'deployment-relationship-analysis',
  'research-before-repair', 'repair-revalidation', 'current-before-history', 'evidence-before-pass'
]) {
  if (!capabilities.includes(required)) violations.push(`missing active capability: ${required}`);
}

const seriousFailedAttempts = Number.parseInt(process.env.RADIO_CODEFORGE_FAILED_ATTEMPTS ?? '0', 10) || 0;
const complexitySignals = [
  touchedDomains.length >= 3,
  productionChanges.length >= 5,
  workflowChanges.length > 0 && productionChanges.length > 0,
  seriousFailedAttempts >= (codex.triggerAfterSeriousFailedAttempts ?? 3)
].filter(Boolean).length;
const codexEscalationRecommended = codex.enabled === true && (seriousFailedAttempts >= (codex.triggerAfterSeriousFailedAttempts ?? 3) || complexitySignals >= 2);

if (codexEscalationRecommended) {
  findings.push('complexity/blocker threshold reached for emergency Codex escalation');
  recommendations.push('Request Codex assistance through the available host/chat route. Treat Codex as a helper only; review its result in Radio-CodeForge and run the full radio audit/revalidation before promotion.');
}

const finalRecommendations = unique(recommendations);
const finalFindings = unique(findings);

console.log(`RADIO_CODEFORGE_SYSTEM=${config.systemId}`);
console.log('RADIO_CODEFORGE_MODE=ACTIVE_PARALLEL_DEVELOPMENT_ASSISTANT');
console.log('RADIO_CODEFORGE_RUNTIME_INFILTRATION=FORBIDDEN');
console.log('RADIO_CODEFORGE_MUTATION_AUTHORITY=NONE');
console.log('RADIO_CODEFORGE_LEARNING_SOURCE=666CODEFORGE');
console.log('RADIO_CODEFORGE_LEARNING_MODE=CAPABILITY_ADAPTATION_ONLY');
console.log(`RADIO_CODEFORGE_LEARNED_CAPABILITIES=${learningProfile.adaptedCapabilities?.length ?? 0}`);
console.log(`RADIO_CODEFORGE_BRANCH=${branch || 'DETACHED'}`);
console.log(`RADIO_CODEFORGE_COMMIT=${commit}`);
console.log(`RADIO_CODEFORGE_DIFF_RANGE=${diffRange || 'UNAVAILABLE'}`);
console.log(`RADIO_CODEFORGE_CHANGED_FILES=${changedNames.length}`);
console.log(`RADIO_CODEFORGE_DOMAINS=${touchedDomains.join(',') || 'NONE'}`);
console.log(`RADIO_CODEFORGE_FINDINGS=${finalFindings.length}`);
console.log(`RADIO_CODEFORGE_RECOMMENDATIONS=${finalRecommendations.length}`);
console.log(`RADIO_CODEFORGE_CODEX_ESCALATION=${codexEscalationRecommended ? 'RECOMMENDED' : 'NOT_REQUIRED'}`);
console.log('RADIO_CODEFORGE_CODEX_AUTHORITY=NONE');
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
    `- Learning source: **666CODEFORGE / capability-adaptation-only**`,
    `- Adapted capabilities: **${learningProfile.adaptedCapabilities?.length ?? 0}**`,
    `- Codex escalation: **${codexEscalationRecommended ? 'RECOMMENDED' : 'not required'}**`,
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
  console.log('RADIO_CODEFORGE_LEARNING_INTEGRATION=PASS');
  console.log('RADIO_CODEFORGE_ISOLATION=PASS');
  console.log('RADIO_CODEFORGE_FORCE=PASS');
}
