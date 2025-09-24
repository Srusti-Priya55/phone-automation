// wdio.conf.ts
import { androidRealCaps } from './config/android.real.cap'
import allure from '@wdio/allure-reporter'
import { attachScreenshot } from './test/utils/report'
import { dumpNvmLogs } from './test/utils/logcat'

// keep these as you had
const MOCHA_RETRIES = parseInt(process.env.MOCHA_RETRIES || '0', 10)
const SPEC_RETRIES  = parseInt(process.env.SPEC_RETRIES  || '0', 10)

// use Node's path so we can build a stable per-test id
const path = require('path');

export const config: WebdriverIO.Config = {
  runner: 'local',
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',

  specs: ['./test/specs/**/*.ts'],
  exclude: [],

  // ---- Jenkins checkboxes (unchanged) ----
  suites: {
    install_adb: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-and-register.e2e.ts',
      'test/specs/add-asa-and-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    install_play: [
      'test/specs/install-play.e2e.ts',
      'test/specs/push-and-register.e2e.ts',
      'test/specs/add-asa-and-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-play.e2e.ts',
    ],
    aggregation_check: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/aggregation-check.e2e.ts',
      'test/specs/add-asa-and-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    tnd_check: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/tnd-check.e2e.ts',
      'test/specs/add-asa-and-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    negatives: [
      'test/specs/neg-Reregister-same-profile.e2e.ts',
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
  const allure = require('@wdio/allure-reporter').default
  const flow   = process.env.CURRENT_FLOW || 'Adhoc'

  // Which spec file and which "describe" title produced this test
  const fileBase = test.file ? path.basename(test.file, path.extname(test.file)) : ''
  const parent   = test.parent || ''     // the `describe(...)` title
  const title    = test.title  || ''     // the `it(...)` title

  // 1) Top-level group = FLOW (Aggregation / TND / Negatives / etc.)
  allure.addLabel('parentSuite', flow)

  // 2) Second level = the spec/section name (so you get 7 items per flow)
  //    Use the describe title if present, otherwise fall back to file name.
  allure.addLabel('suite', parent || fileBase)

  // 3) Make this test unique across flows/specs so Allure never merges them
  const uniqueId = `${flow}::${fileBase}::${parent}::${title}`
  allure.addLabel('testCaseId', uniqueId)
  allure.addLabel('historyId',  uniqueId)
  allure.addLabel('fullName',   uniqueId)   // belt & suspenders
},

  afterTest: async (test, _context, { passed }) => {
    if (!passed) await attachScreenshot(`Failed - ${test.title}`)
    if (/\b(NVM|VPN|Wi[- ]?Fi)\b/i.test(test.title) || process.env.NVM_LOGS === '1') {
      await dumpNvmLogs(2000)
    }
  },
}