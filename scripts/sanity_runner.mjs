#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const flags = {
  RUN_ALL: process.env.RUN_ALL === 'true' || process.env.RUN_ALL === 'on' || process.env.RUN_ALL === '1',
  INSTALL_ADB: process.env.INSTALL_ADB === 'true' || process.env.INSTALL_ADB === 'on' || process.env.INSTALL_ADB === '1',
  INSTALL_PLAY: process.env.INSTALL_PLAY === 'true' || process.env.INSTALL_PLAY === 'on' || process.env.INSTALL_PLAY === '1',
  AGGREGATION_CHECK: process.env.AGGREGATION_CHECK === 'true' || process.env.AGGREGATION_CHECK === 'on' || process.env.AGGREGATION_CHECK === '1',
  TND_CHECK: process.env.TND_CHECK === 'true' || process.env.TND_CHECK === 'on' || process.env.TND_CHECK === '1',
  NEGATIVES: process.env.NEGATIVES === 'true' || process.env.NEGATIVES === 'on' || process.env.NEGATIVES === '1',
};

if (flags.RUN_ALL) {
  flags.INSTALL_ADB = true;
  flags.INSTALL_PLAY = true;
  flags.AGGREGATION_CHECK = true;
  flags.TND_CHECK = true;
  flags.NEGATIVES = true;
}

console.log('Effective flags:', flags);

// Always use FORWARD SLASHES for WDIO, even on Windows
const p = (rel) => rel.replace(/\\/g, '/');

// Define the spec sets (use forward slashes)
const SETS = {
  INSTALL_ADB: [
    p('test/specs/install-adb.e2e.ts'),
    p('test/specs/push-and-register.e2e.ts'),
    p('test/specs/add-asa-and-connect.e2e.ts'),
    p('test/specs/nvm-service-check.e2e.ts'),
    p('test/specs/interface-change-check.e2e.ts'),
    p('test/specs/unregister-profile.e2e.ts'),
    p('test/specs/uninstall-adb.e2e.ts'),
  ],
  INSTALL_PLAY: [
    p('test/specs/install-play.e2e.ts'),
    p('test/specs/push-and-register.e2e.ts'),
    p('test/specs/add-asa-and-connect.e2e.ts'),
    p('test/specs/nvm-service-check.e2e.ts'),
    p('test/specs/interface-change-check.e2e.ts'),
    p('test/specs/unregister-profile.e2e.ts'),
    p('test/specs/uninstall-play.e2e.ts'),
  ],
  AGGREGATION_CHECK: [
    p('test/specs/install-adb.e2e.ts'),
    p('test/specs/aggregation-check.e2e.ts'),
    p('test/specs/add-asa-and-connect.e2e.ts'),
    p('test/specs/nvm-service-check.e2e.ts'),
    p('test/specs/interface-change-check.e2e.ts'),
    p('test/specs/unregister-profile.e2e.ts'),
    p('test/specs/uninstall-adb.e2e.ts'),
  ],
  TND_CHECK: [
    p('test/specs/install-adb.e2e.ts'),
    p('test/specs/tnd-check.e2e.ts'),
    p('test/specs/add-asa-and-connect.e2e.ts'),
    p('test/specs/nvm-service-check.e2e.ts'),
    p('test/specs/interface-change-check.e2e.ts'),
    p('test/specs/unregister-profile.e2e.ts'),
    p('test/specs/uninstall-adb.e2e.ts'),
  ],
  NEGATIVES: [
    p('test/specs/neg-Reregister-same-profile.e2e.ts'),
    p('test/specs/neg-invalid-profile-push-register.e2e.ts'),
    p('test/specs/neg-uninstall-not-installed.e2e.ts'),
  ],
};

// Build the final list in order
const orderedKeys = ['INSTALL_ADB', 'INSTALL_PLAY', 'AGGREGATION_CHECK', 'TND_CHECK', 'NEGATIVES'];
let specs = [];
for (const key of orderedKeys) {
  if (flags[key]) specs = specs.concat(SETS[key]);
}

// De-duplicate while preserving order
const seen = new Set();
specs = specs.filter(s => (seen.has(s) ? false : (seen.add(s), true)));

if (!specs.length) {
  console.log('No features selected → exiting 0');
  process.exit(0);
}

// Verify existence and print helpful error if something is missing
const missing = specs.filter(rel => !fs.existsSync(path.resolve(rel)));
if (missing.length) {
  console.error('These spec files were not found (check file names/paths):');
  missing.forEach(m => console.error('  -', m));
  process.exit(1);
}

// Prefer npm ci when package-lock.json is present (faster & reproducible)
const hasLock = fs.existsSync(path.resolve('package-lock.json'));
const installCmd = hasLock ? 'npm ci' : 'npm install';

// Run install first (only when node_modules is absent)
const needInstall = !fs.existsSync(path.resolve('node_modules'));

const runWdio = () => {
  const specArg = specs.join(',');
  console.log(`\n=== WDIO: ${specs.join(',')} ===\n`);
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['wdio', 'run', './wdio.conf.ts', '--spec', specArg],
    { stdio: 'inherit' }
  );
  child.on('close', code => process.exit(code));
  child.on('error', err => {
    console.error('Error starting WDIO:', err);
    process.exit(1);
  });
};

if (needInstall) {
  console.log(`Running ${installCmd} ...`);
  const child = spawn(process.platform === 'win32' ? 'cmd' : 'bash',
    [process.platform === 'win32' ? '/c' : '-lc', installCmd],
    { stdio: 'inherit' }
  );
  child.on('close', code => {
    if (code !== 0) process.exit(code);
    runWdio();
  });
  child.on('error', err => {
    console.error('Error running install:', err);
    process.exit(1);
  });
} else {
  runWdio();
}
