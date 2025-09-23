// test/specs/negative-uninstall-not-installed.e2e.ts
import { driver } from '@wdio/globals'
import allure from '@wdio/allure-reporter'
import { Status } from 'allure-js-commons'
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
import { step } from '../utils/report'
import { labelSection } from '../utils/flow'
const exec = promisify(_exec)

/* ---------- constants ---------- */
const PKG = 'com.cisco.anyconnect.vpn.android.avf'

/* ---------- tiny helpers ---------- */
async function takeAndAttachScreenshot(name: string) {
  const b64 = await driver.takeScreenshot()
  allure.addAttachment(name, Buffer.from(b64, 'base64'), 'image/png')
}


// run shell (handles Windows "cmd /c")
async function run(cmd: string) {
  const full = process.platform === 'win32' ? `cmd /c ${cmd}` : cmd
  try {
    const res = await exec(full, { maxBuffer: 10 * 1024 * 1024 })
    return { code: 0, stdout: res.stdout ?? '', stderr: res.stderr ?? '' }
  } catch (e: any) {
    // node exec throws on non-zero exit; surface code & output
    return {
      code: typeof e.code === 'number' ? e.code : 1,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? (e.message || ''),
    }
  }
}

/* ---------- the test ---------- */
/**
 * Tags in the suite title let you filter from Jenkins:
 *   @sanity @negative @adb @uninstall
 */
describe('Uninstall via ADB when app is NOT installed', () => {
  before(() => labelSection('Negative- UNinstall when not installed'))

  it('fails to uninstall and reports a meaningful error', async () => {
    // 1) Ensure precondition: app is NOT installed
    await step('Ensure app is not installed (remove if present)', async () => {
      const installed = await driver.isAppInstalled(PKG)
      if (installed) {
        // best-effort removal to reach the negative precondition
        try {
          await driver.removeApp(PKG)
        } catch {
          // fall back to adb to force remove
          await run(`adb uninstall ${PKG}`)
        }
      }
      const stillInstalled = await driver.isAppInstalled(PKG)
      if (stillInstalled) {
        throw new Error(`Precondition failed: ${PKG} still appears installed`)
      }
    })

    // 2) Attempt uninstall via ADB (should FAIL / return non-zero or "Failure" text)
    const result = await step('Run "adb uninstall" on a non-installed package', async () => {
      return run(`adb uninstall ${PKG}`)
    })

    await step('Validate uninstall reported failure', async () => {
      const out = `${result.stdout}\n${result.stderr}`.trim()
      const reportedFailure =
        result.code !== 0 ||
        /Failure/i.test(out) ||
        /not\s+installed/i.test(out) ||
        /Unknown\s+package/i.test(out) ||
        /DELETE_FAILED/i.test(out)

      if (!reportedFailure) {
        // If adb returned 0/success here, the app must have been installed,
        // which violates the test’s precondition.
        throw new Error(
          `Expected uninstall failure, but ADB returned code=${result.code}.\nOutput:\n${out || '(no output)'}`
        )
      }

      // Attach raw output for debugging
      allure.addAttachment('adb uninstall output', out || '(empty)', 'text/plain')
    })

    // 3) Double-check that app is still NOT installed
    await step('Re-check package is not installed', async () => {
      const installed = await driver.isAppInstalled(PKG)
      if (installed) throw new Error(`${PKG} unexpectedly became installed`)
    })
  })
})
