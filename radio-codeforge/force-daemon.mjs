#!/usr/bin/env node

import { readFileSync, existsSync, statSync } from 'node:fs';
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

if (!existsSync(configPath)) {
  fail('missing radio-codeforge configuration');
  process.exit();
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const violations = [];
const observations = [];

if (config.runtimeIntegration !== false) violations.push('runtimeIntegration must remain false');
if (config.sourceMutationAuthority !== false) violations.push('sourceMutationAuthority must remain false');
if (config.deploymentMutationAuthority !== false) violations.push('deploymentMutationAuthority must remain false');
if (config.pfsMutationAuthority !== false) violations.push('pfsMutationAuthority must remain false');

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
const status = git(['status', '--porcelain']);
const changedFiles = status ? status.split('\n').filter(Boolean).length : 0;

const riskRoots = ['public/', 'workers/', 'functions/', 'scripts/', '.github/workflows/', 'tests/'];
const changedNames = status
  ? status.split('\n').map((line) => line.slice(3).trim()).filter(Boolean)
  : [];
for (const riskRoot of riskRoots) {
  const count = changedNames.filter((file) => file.startsWith(riskRoot)).length;
  if (count) observations.push(`${riskRoot}:${count}`);
}

console.log(`RADIO_CODEFORGE_SYSTEM=${config.systemId}`);
console.log('RADIO_CODEFORGE_MODE=PARALLEL_DEVELOPMENT_ASSISTANT');
console.log('RADIO_CODEFORGE_RUNTIME_INFILTRATION=FORBIDDEN');
console.log('RADIO_CODEFORGE_MUTATION_AUTHORITY=NONE');
console.log(`RADIO_CODEFORGE_BRANCH=${branch || 'DETACHED'}`);
console.log(`RADIO_CODEFORGE_COMMIT=${commit}`);
console.log(`RADIO_CODEFORGE_WORKTREE_CHANGES=${changedFiles}`);
console.log(`RADIO_CODEFORGE_RISK_AREAS=${observations.join(',') || 'NONE'}`);

if (violations.length) {
  for (const violation of violations) console.error(`RADIO_CODEFORGE_VIOLATION=${violation}`);
  fail(`${violations.length} isolation violation(s)`);
} else {
  console.log('RADIO_CODEFORGE_ISOLATION=PASS');
  console.log('RADIO_CODEFORGE_FORCE=PASS');
}
