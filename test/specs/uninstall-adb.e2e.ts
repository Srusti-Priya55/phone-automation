// test/specs/uninstall-adb.e2e.ts
import { driver } from '@wdio/globals'
import { feature, story, severity, step } from '../utils/report'
import allure from '@wdio/allure-reporter'
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
import { FLOW_SUFFIX } from '../utils/flow';

const exec = promisify(_exec)

/** ---- Config ---- */
const PKG = 'com.cisco.anyconnect.vpn.android.avf'

/** ---- Small utils ---- */
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

async function run(cmd: string, maxBuffer = 20 * 1024 * 1024) {
  const full = process.platform === 'win32' ? `cmd /c ${cmd}` : cmd
  return exec(full, { maxBuffer })
}

async function isInstalled(pkg: string): Promise<boolean> {
  try {
    return driver.isAppInstalled(pkg)
  } catch {
    return false
  }
}

async function adbUninstall(pkg: string): Promise<void> {
  // Try ADB uninstall; ignore non-zero if package not found
  await run(`adb uninstall ${pkg}`).catch(() => {})
}

/** ---- Reusable runner ---- */
export async function runUninstallAdb() {
  // Pre-flight visibility (optional evidence in report)
  await step('Record installed Cisco packages (before)', async () => {
    const grepCmd = process.platform === 'win32'
      ? `adb shell pm list packages | findstr /i cisco`
      : `adb shell pm list packages | grep -i cisco || true`
    const { stdout } = await run(grepCmd).catch(() => ({ stdout: '' }))
    allure.addAttachment('Packages before uninstall', stdout || '(none)', 'text/plain')
  })

  const present = await step('Check if Cisco Secure Client is installed', async () => {
    return isInstalled(PKG)
  })

  await step('Fail fast if app is not installed', async () => {
    if (!present) {
      throw new Error(
        `Cisco Secure Client (${PKG}) is not installed on the device.\n` +
        `Nothing to uninstall. If this was intentional as a negative test, run the dedicated negative spec.`
      )
    }
  })

  await step('Try WebDriver uninstall (removeApp)', async () => {
    // Primary path: WebDriver uninstall
    try {
      await driver.removeApp(PKG)
    } catch (e) {
      // Fallback to raw ADB if WD path fails (OEM/permission quirks)
      await adbUninstall(PKG)
    }
    await sleep(800)
  })

  await step('Verify package is no longer installed', async () => {
    const stillThere = await isInstalled(PKG)
    if (stillThere) {
      // One more hard attempt via ADB before failing
      await adbUninstall(PKG)
      await sleep(800)
    }
    const finalState = await isInstalled(PKG)
    if (finalState) {
      throw new Error(
        `Uninstall verification failed: ${PKG} still reports as installed.\n` +
        `Check device owner/profile policies or try removing manually: "adb uninstall ${PKG}".`
      )
    }
  })

  await step('Record installed Cisco packages (after)', async () => {
    const grepCmd = process.platform === 'win32'
      ? `adb shell pm list packages | findstr /i cisco`
      : `adb shell pm list packages | grep -i cisco || true`
    const { stdout } = await run(grepCmd).catch(() => ({ stdout: '' }))
    allure.addAttachment('Packages after uninstall', stdout || '(none)', 'text/plain')
  })
}

/** ---- Test ---- */

describe('Uninstall Cisco Secure Client via ADB'+ FLOW_SUFFIX, () => {
  before(() => {
    feature('Uninstallation')
    story('Uninstall via ADB')
    severity('normal')
  })

  it('removes the app cleanly and verifies it is gone', async () => {
    await runUninstallAdb()
  })
})

