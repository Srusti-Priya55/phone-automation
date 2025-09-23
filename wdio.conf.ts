// wdio.conf.ts
import { androidRealCaps } from './config/android.real.cap'
import allure from '@wdio/allure-reporter'
import { attachScreenshot } from './test/utils/report'
import { dumpNvmLogs } from './test/utils/logcat'
import path from 'node:path'
const MOCHA_RETRIES = parseInt(process.env.MOCHA_RETRIES || '0', 10)
const SPEC_RETRIES  = parseInt(process.env.SPEC_RETRIES  || '0', 10)

export const config: WebdriverIO.Config = {
  runner: 'local',

  hostname: '127.0.0.1',
  port: 4723,
  path: '/',

  specs: ['./test/specs/**/*.ts'],
  exclude: [],

  /**
   * SUITES for Jenkins checkboxes
   * (names are simple and match your manager’s wording)
   */
  suites: {
    // 1) Installation via ADB
    install_adb: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-and-register.e2e.ts',
      'test/specs/add-asa-and-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],

    // 2) Installation via Play Store
    install_play: [
      'test/specs/install-play.e2e.ts',
      'test/specs/push-and-register.e2e.ts',
      'test/specs/add-asa-and-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-play.e2e.ts',
    ],

    // 3) Aggregation check (same flow, swap aggregation step)
    aggregation_check: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/aggregation-check.e2e.ts',
      'test/specs/add-asa-and-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],

    // 4) TND check (same flow, swap TND step)
    tnd_check: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/tnd-check.e2e.ts',
      'test/specs/add-asa-and-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],

    // 5) Negatives pack
    negatives: [
      'test/specs/neg-Reregister-same-profile.e2e.ts',       // note: capital "R" matches your file
      'test/specs/neg-invalid-profile-push-register.e2e.ts',
      'test/specs/neg-uninstall-not-installed.e2e.ts',
    ],
  },

  maxInstances: 1,
  capabilities: [androidRealCaps as any],

  logLevel: 'info',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 90000,
    retries: MOCHA_RETRIES,
  },

  specFileRetries: SPEC_RETRIES,
  specFileRetriesDelay: 2,

  reporters: [
    'spec',
    ['allure', {
      outputDir: 'allure-results',
      useCucumberStepReporter: false,
      disableWebdriverStepsReporting: true,
      disableWebdriverScreenshotsReporting: true,
      addConsoleLogs: true,
    }]
  ],

beforeTest: async (test) => {
  // Allure instance
  const allure = require('@wdio/allure-reporter').default;

  // Flow name comes from the batch file
  const flow = process.env.CURRENT_FLOW || 'Adhoc';

  // Top level in Allure = the flow (Aggregation / TND / Negatives)
  allure.addLabel('parentSuite', flow);

  // Second level in Allure = the spec file name (one box per file)
  // -> keeps the tree flat and gives you 7 per flow if you have 7 files
  const file =
    (test as any).file?.split(/[\\/]/).pop()?.replace(/\.[tj]s$/, '') ||
    test.parent ||
    'spec';
  allure.addLabel('suite', file);

  // Make the test unique per flow so Allure won’t merge the same step
  // name across Aggregation/TND
  const id = `${flow}::${file}::${test.title}`;
  allure.addLabel('testCaseId', id);
},

  afterTest: async (test, _context, { passed }) => {
    if (!passed) await attachScreenshot(`Failed - ${test.title}`)
    if (/\b(NVM|VPN|Wi[- ]?Fi)\b/i.test(test.title) || process.env.NVM_LOGS === '1') {
      await dumpNvmLogs(2000)
    }
  },
}
