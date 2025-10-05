// wdio.conf.ts
import { androidRealCaps } from './config/android.real.cap'
import allure from '@wdio/allure-reporter'
import { attachScreenshot } from './test/utils/report'
import { dumpNvmLogs } from './test/utils/logcat'

const MOCHA_RETRIES = parseInt(process.env.MOCHA_RETRIES || '0', 10)
const SPEC_RETRIES  = parseInt(process.env.SPEC_RETRIES  || '0', 10)

// use Node's path so we can build a stable per-test id
const path = require('path')

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
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    install_play: [
      'test/specs/install-play.e2e.ts',
      'test/specs/push-and-register.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-play.e2e.ts',
    ],
    aggregation_check: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-trusted-and-register.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/disconnect-vpn.e2e.ts',
      'test/specs/traffic.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    tnd_check: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-trusted-and-register.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    collection_mode_all: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-and-register.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/disconnect-vpn.e2e.ts',
      'test/specs/traffic.e2e.ts',
      'test/specs/nvm-logs.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],

    collection_mode_trusted: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-trusted-and-register.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/disconnect-vpn.e2e.ts',
      'test/specs/traffic.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],

    collection_mode_untrusted: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-untrusted-and-register.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/disconnect-vpn.e2e.ts',
      'test/specs/traffic.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],

    interface_info: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-and-register.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/disconnect-vpn.e2e.ts',
      'test/specs/interface-change-check.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    ipfix_disable: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-and-register-etc.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/disconnect-vpn.e2e.ts',
      'test/specs/traffic.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    ipfix_zero: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-and-register-etc0.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/disconnect-vpn.e2e.ts',
      'test/specs/traffic.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    
    parent_process_check: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-trusted-and-register.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/traffic.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],

    template_caching_untrusted: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/template-caching-untrusted.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/traffic.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    before_after_reboot: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-trusted-and-register.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/disconnect-vpn.e2e.ts',
      'test/specs/reboot-and-traffic.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    aup_should_displayed: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-and-register.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/aup-verify.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],

    aup_should_not_displayed: [
      'test/specs/install-adb.e2e.ts',
      'test/specs/push-trusted-and-register.e2e.ts',
      'test/specs/vpn-connect.e2e.ts',
      'test/specs/nvm-service-check.e2e.ts',
      'test/specs/aup-verify.e2e.ts',
      'test/specs/unregister-profile.e2e.ts',
      'test/specs/uninstall-adb.e2e.ts',
    ],
    eula_not_accepted: [
      'test/specs/push-and-register.e2e.ts',
      'test/specs/install-adb-cancel-eula.e2e.ts',
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
// wdio.conf.ts
beforeTest: async (test) => {
  const allure = require('@wdio/allure-reporter').default
  const path = require('path')
  const flow = process.env.CURRENT_FLOW || 'Adhoc'

  const fileBase = test.file ? path.basename(test.file, path.extname(test.file)) : ''
  const title    = test.title || ''

  // DO NOT set 'suite' or 'parentSuite' here
  const id = `${flow}::${fileBase}::${title}`
  allure.addLabel('testCaseId', id)
  allure.addLabel('historyId', id)
  allure.addLabel('fullName', id)
},


afterTest: async (test, _context, { passed }) => {
  try {
    const rebooting = (global as any).__REBOOT_IN_PROGRESS__ === true
    if (!passed && !rebooting && (browser as any)?.sessionId) {
      await attachScreenshot(`Failed - ${test.title}`)
    }
  } catch {}
  if (/\b(NVM|VPN|Wi[- ]?Fi)\b/i.test(test.title) || process.env.NVM_LOGS === '1') {
    await dumpNvmLogs(2000).catch(() => {})
  }
},



}