// wdio.conf.ts
import { androidRealCaps } from './config/android.real.cap'
import allure from '@wdio/allure-reporter'
import { attachScreenshot } from './test/utils/report'
import { dumpNvmLogs } from './test/utils/logcat'

const MOCHA_RETRIES = parseInt(process.env.MOCHA_RETRIES || '0', 10)
const SPEC_RETRIES  = parseInt(process.env.SPEC_RETRIES  || '0', 10)

export const config: WebdriverIO.Config = {
  runner: 'local',

  hostname: '127.0.0.1',
  port: 4723,
  path: '/',

  // Keep the broad glob for regular runs…
  specs: ['./test/specs/**/*.ts'],
  exclude: [],

  // …but define suites to run just the chain files
  suites: {
    e2e_adb: ['./test/specs/e2e-adb.e2e.ts'],
    e2e_play: ['./test/specs/e2e-playstore.e2e.ts'],
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
    retries: MOCHA_RETRIES,      // default 0; set MOCHA_RETRIES=1 if you want retries
  },

  // Retries for whole spec files
  specFileRetries: SPEC_RETRIES, // default 0; set SPEC_RETRIES=1 to retry a failing file once
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

  //
  // Hooks
  //
  beforeTest: async (test) => {
    allure.addLabel('suite', test.parent)
  },

  afterTest: async (test, _context, { passed }) => {
    if (!passed) {
      await attachScreenshot(`Failed - ${test.title}`)
    }
    if (/\b(NVM|VPN|Wi[- ]?Fi)\b/i.test(test.title) || process.env.NVM_LOGS === '1') {
      await dumpNvmLogs(2000)
    }
  },
}
