// test/specs/e2e-playstore.e2e.ts
process.env.E2E_CHAIN = '1' 


const { runInstallPlay }        = require('./install-play.e2e')
const { runPushAndRegister }    = require('./push-and-register.e2e')
const { runCheckNvmService }    = require('./nvm-service-check.e2e')
const { runAddAsaAndConnect }   = require('./add-asa-and-connect.e2e')
const { runInterfaceChangeCheck } = require('./interface-change-check.e2e')
const { runUnregisterProfile }  = require('./unregister-profile.e2e')
const { runUninstallPlay }      = require('./uninstall-play.e2e')

import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(_exec)

describe('@e2e_play End-to-End via Play Store', function () {
  
  this.timeout(20 * 60 * 1000) // 20 minutes

  it('runs the full flow once', async () => {
    await runInstallPlay()
    await runPushAndRegister()
    await runCheckNvmService()
    await runAddAsaAndConnect()
    await runInterfaceChangeCheck()
    await runUnregisterProfile()
    await runUninstallPlay()
  })

  after(async () => {
    if (process.env.OPEN_ALLURE === '1' && !process.env.CI) {
      try {
        await exec('npx allure generate ./allure-results --clean -o ./allure-report')
        await exec('npx allure open ./allure-report')
      } catch {}
    }
  })
})
