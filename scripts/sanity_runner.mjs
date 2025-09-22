// scripts/sanity_runner.mjs
// Node ESM runner to execute WDIO specs based on Jenkins boolean parameters.
// Works on Windows agents (uses `npx` with { shell: true } and absolute paths).

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// --- 1) Read Jenkins boolean params (checkboxes) ---
// Jenkins passes them as environment variables with values "true"/"false"
const flags = {
  RUN_ALL:           toBool(process.env.RUN_ALL),
  INSTALL_ADB:       toBool(process.env.INSTALL_ADB),
  INSTALL_PLAY:      toBool(process.env.INSTALL_PLAY),
  AGGREGATION_CHECK: toBool(process.env.AGGREGATION_CHECK),
  TND_CHECK:         toBool(process.env.TND_CHECK),
  NEGATIVES:         toBool(process.env.NEGATIVES),
};

console.log('Effective flags:', flags);

// If RUN_ALL was checked, enable all feature flags
if (flags.RUN_ALL) {
  flags.INSTALL_ADB = true;
  flags.INSTALL_PLAY = true;
  flags.AGGREGATION_CHECK = true;
  flags.TND_CHECK = true;
  flags.NEGATIVES = true;
}

// --- 2) Map each checkbox to a list of WDIO spec files (POSIX-style paths) ---
const SUITES = {
  INSTALL_ADB: [
    'test/specs/install-adb.e2e.ts',
    'test/specs/push-and-register.e2e.ts',
    'test/specs/add-asa-and-connect.e2e.ts',
    'test/specs/nvm-service-check.e2e.ts',
    'test/specs/interface-change-check.e2e.ts',
    'test/specs/unregister-profile.e2e.ts',
    'test/specs/uninstall-adb.e2e.ts',
  ],
  INSTALL_PLAY: [
    'test/specs/install-play.e2e.ts',
    'test/specs/push-and-register.e2e.ts',
    'test/specs/add-asa-and-connect.e2e.ts',
    'test/specs/nvm-service-check.e2e.ts',
    'test/specs/interface-change-check.e2e.ts',
    'test/specs/unregister-profile.e2e.ts',
    'test/specs/uninstall-play.e2e.ts',
  ],
  AGGREGATION_CHECK: [
    'test/specs/install-adb.e2e.ts',
    'test/specs/aggregation-check.e2e.ts',
    'test/specs/add-asa-and-connect.e2e.ts',
    'test/specs/nvm-service-check.e2e.ts',
    'test/specs/interface-change-check.e2e.ts',
    'test/specs/unregister-profile.e2e.ts',
    'test/specs/uninstall-adb.e2e.ts',
  ],
  TND_CHECK: [
    'test/specs/install-adb.e2e.ts',
    'test/specs/tnd-check.e2e.ts',
    'test/specs/add-asa-and-connect.e2e.ts',
    'test/specs/nvm-service-check.e2e.ts',
    'test/specs/interface-change-check.e2e.ts',
    'test/specs/unregister-profile.e2e.ts',
    'test/specs/uninstall-adb.e2e.ts',
  ],
  NEGATIVES: [
    'test/specs/neg-Reregister-same-profile.e2e.ts',
    'test/specs/neg-invalid-profile-push-register.e2e.ts',
    'test/specs/neg-uninstall-not-installed.e2e.ts',
  ],
};

// --- 3) Build the final spec list in the order you want ---
const specs = [];
for (const [key, list] of Object.entries(SUITES)) {
  if (flags[key]) specs.push(...list);
}

// If nothing was selected, fail early with a clear message
if (specs.length === 0) {
  console.error(
    'No features selected. Check at least one checkbox (or RUN_ALL).'
  );
  process.exit(2);
}

// --- 4) Verify each spec actually exists on disk (prevents WDIO not-found) ---
const missing = specs.filter(p => !existsPosix(p));
if (missing.length) {
  console.error('These spec files were not found:\n - ' + missing.join('\n - '));
  process.exit(3);
}

// --- 5) Run `npm ci` (fresh, reproducible install) and then WDIO with --spec ---
await runNpmCi();
await runWdio(specs);

// ------------- helpers -------------
function toBool(v) {
  if (!v) return false;
  return String(v).trim().toLowerCase() === 'true';
}

// Check file existence for a POSIX-style path relative to workspace
function existsPosix(posixRelPath) {
  const abs = path.resolve(posixRelPath.split('/').join(path.sep));
  try {
    return fs.existsSync(abs);
  } catch {
    return false;
  }
}

function runNpmCi() {
  console.log('\n=== npm ci (clean install) ===\n');
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['ci'], { stdio: 'inherit', shell: true });
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(`npm ci exit ${code}`))));
    child.on('error', reject);
  });
}

function runWdio(specList) {
  const specArg = specList.join(',');
  const wdioConfAbs = path.resolve('wdio.conf.ts'); // absolute path (Windows-safe)

  console.log(`\n=== WDIO: ${specArg} ===\n`);

  return new Promise((resolve, reject) => {
    // Always call `npx` and use shell:true so Windows resolves npx.cmd correctly
    const child = spawn(
      'npx',
      ['wdio', 'run', wdioConfAbs, '--spec', specArg],
      { stdio: 'inherit', shell: true }
    );

    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`WDIO exit ${code}`));
    });
    child.on('error', reject);
  });
}
