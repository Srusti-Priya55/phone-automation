// scripts/sanity_runner.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const spec = (name) => path.join('test', 'specs', name);

// ----- feature chains (exact filenames from your repo) -----
const CHAINS = {
  INSTALL_ADB: [
    spec('install-adb.e2e.ts'),
    spec('push-and-register.e2e.ts'),
    spec('add-asa-and-connect.e2e.ts'),
    spec('nvm-service-check.e2e.ts'),
    spec('interface-change-check.e2e.ts'),
    spec('unregister-profile.e2e.ts'),
    spec('uninstall-adb.e2e.ts'),
  ],
  INSTALL_PLAY: [
    spec('install-play.e2e.ts'),
    spec('push-and-register.e2e.ts'),
    spec('add-asa-and-connect.e2e.ts'),
    spec('nvm-service-check.e2e.ts'),
    spec('interface-change-check.e2e.ts'),
    spec('unregister-profile.e2e.ts'),
    spec('uninstall-play.e2e.ts'),
  ],
  AGGREGATION_CHECK: [
    spec('install-adb.e2e.ts'),               // choose ADB install for aggr flow
    spec('aggregation-check.e2e.ts'),
    spec('add-asa-and-connect.e2e.ts'),
    spec('nvm-service-check.e2e.ts'),
    spec('interface-change-check.e2e.ts'),
    spec('unregister-profile.e2e.ts'),
    spec('uninstall-adb.e2e.ts'),
  ],
  TND_CHECK: [
    spec('install-adb.e2e.ts'),
    spec('tnd-check.e2e.ts'),
    spec('add-asa-and-connect.e2e.ts'),
    spec('nvm-service-check.e2e.ts'),
    spec('interface-change-check.e2e.ts'),
    spec('unregister-profile.e2e.ts'),
    spec('uninstall-adb.e2e.ts'),
  ],
  NEGATIVES: [
    spec('neg-Reregister-same-profile.e2e.ts'),
    spec('neg-invalid-profile-push-register.e2e.ts'),
    spec('neg-uninstall-not-installed.e2e.ts'),
  ],
};

const ORDER = ['INSTALL_ADB','INSTALL_PLAY','AGGREGATION_CHECK','TND_CHECK','NEGATIVES'];

function toBool(v) {
  if (v == null) return false;
  const s = String(v).toLowerCase();
  return ['1','true','yes','on','checked'].includes(s);
}

async function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',  // make 'npx' resolution easy on Windows
    });
    proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)));
  });
}

async function runWdio(specList) {
  const csv = specList.join(',');
  console.log(`\n=== WDIO: ${csv} ===\n`);
  await run('npx', ['wdio', 'run', './wdio.conf.ts', '--spec', csv]);
}

(async () => {

  // Expand RUN_ALL into all flags
  const RUN_ALL = toBool(process.env.RUN_ALL);
  const FLAGS = {
    INSTALL_ADB:        RUN_ALL || toBool(process.env.INSTALL_ADB),
    INSTALL_PLAY:       RUN_ALL || toBool(process.env.INSTALL_PLAY),
    AGGREGATION_CHECK:  RUN_ALL || toBool(process.env.AGGREGATION_CHECK),
    TND_CHECK:          RUN_ALL || toBool(process.env.TND_CHECK),
    NEGATIVES:          RUN_ALL || toBool(process.env.NEGATIVES),
  };

  console.log('Effective flags:', FLAGS);

  // Install deps once (faster & consistent)
  await run(process.platform === 'win32' ? 'cmd' : 'npm', 
            process.platform === 'win32' ? ['/c','npm','ci'] : ['ci']);

  for (const key of ORDER) {
    if (FLAGS[key]) {
      await runWdio(CHAINS[key]);  // each chain runs once; no double-runs even if all boxes ticked
    }
  }

  console.log('\nAll requested features finished.\n');
})().catch(err => { console.error(err); process.exit(1); });
