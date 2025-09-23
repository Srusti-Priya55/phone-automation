// test/specs/nvm-service-check.e2e.ts
import { driver, $ } from '@wdio/globals'
import allure from '@wdio/allure-reporter'
import { Status } from 'allure-js-commons'
import { step } from '../utils/report'

// === NEW imports for adb helpers ===
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'

const SETTINGS_PKG = 'com.android.settings'
const SERVICE_NAME = 'Cisco Secure Client'

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

async function takeAndAttachScreenshot(name: string) {
  const b64 = await driver.takeScreenshot()
  allure.addAttachment(name, Buffer.from(b64, 'base64'), 'image/png')
}

async function tapIfText(regex: RegExp, timeout = 4000): Promise<boolean> {
  try {
    const el = await $(`android=new UiSelector().textMatches("${regex.source}")`)
    await el.waitForExist({ timeout })
    if (await el.isDisplayed()) {
      await el.click()
      await driver.pause(500)
      return true
    }
  } catch {}
  return false
}

async function scrollTextIntoView(text: string, maxSwipes = 10): Promise<boolean> {
  try {
    await $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${text}")`)
    const el = await $(`android=new UiSelector().text("${text}")`)
    if (await el.isExisting()) return true
  } catch {}

  for (let i = 0; i < maxSwipes; i++) {
    const el = await $(`android=new UiSelector().text("${text}")`)
    if (await el.isExisting() && await el.isDisplayed()) return true

    const { width, height } = await driver.getWindowRect()
    await driver.performActions([{
      type: 'pointer', id: 'swipe', parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: Math.floor(width * 0.5), y: Math.floor(height * 0.80) },
        { type: 'pointerDown', button: 0 },
        { type: 'pointerMove', duration: 400, x: Math.floor(width * 0.5), y: Math.floor(height * 0.20) },
        { type: 'pointerUp', button: 0 }
      ]
    }])
    await sleep(400)
  }
  return false
}

async function openDeveloperOptionsDirect(): Promise<void> {
  try {
    // Appium mobile shell (works on Appium 2 / UIA2)
    await driver.execute('mobile: shell', {
      command: 'am',
      args: ['start', '-a', 'android.settings.APPLICATION_DEVELOPMENT_SETTINGS'],
      includeStderr: true,
      timeout: 5000
    })
    await sleep(800)
  } catch {
    try {
      await (driver as any).startActivity(SETTINGS_PKG, 'com.android.settings.DevelopmentSettings')
      await sleep(800)
    } catch {}
  }
}

/* ========= NEW: adb helpers for log capture ========= */
const exec = promisify(_exec)

async function runCmd(cmd: string) {
  const full = process.platform === 'win32' ? `cmd /c ${cmd}` : cmd
  return exec(full, { maxBuffer: 10 * 1024 * 1024 })
}

/** Read only nvmagent lines from logcat (never throws; returns empty string on error). */
async function readNvmAgentLogs(): Promise<string> {
  const grepCmd = process.platform === 'win32'
    ? `adb logcat -d | findstr /i nvmagent`
    : `adb logcat -d | grep -i nvmagent || true`

  try {
    const { stdout } = await runCmd(grepCmd)
    return (stdout || '').trim()
  } catch {
    return ''
  }
}
/* ==================================================== */

export async function runCheckNvmService() {
  await step('Open Android Settings', async () => {
    await driver.activateApp(SETTINGS_PKG)
    await sleep(800)
  })

  await step('Go to Developer options', async () => {
    // Many devices show Developer options near the bottom — scroll to it
    const found = await scrollTextIntoView('Developer options', 12)
    if (found) {
      await tapIfText(/^Developer options$/i, 2000)
    } else {
      // Fallback: open Developer options directly via intent/activity
      await openDeveloperOptionsDirect()
    }
    // Assert we actually are inside Dev options by checking for "Running services" or a known entry
    const marker =
      await tapIfText(/Running services/i, 1000) || // if visible already, great — we clicked it
      (await $(`android=new UiSelector().textMatches("(?i)Running services")`).isExisting()) ||
      (await $(`android=new UiSelector().textMatches("(?i)Developer options")`).isExisting())
    if (!marker) {
      throw new Error('Developer options did not open (could not see expected entries)')
    }
  })

  await step('Open Running services', async () => {
    // If we didn’t tap it above, scroll to it now
    const alreadyHere = await $(`android=new UiSelector().textMatches("(?i)^Running services$")`).isDisplayed().catch(() => false)
    if (!alreadyHere) {
      const ok = await scrollTextIntoView('Running services', 10)
      if (!ok) throw new Error('Could not find "Running services" in Developer options')
      const tapped = await tapIfText(/^Running services$/i, 2000)
      if (!tapped) throw new Error('Failed to open "Running services"')
    }
    await sleep(700)
  })

  await step('Verify Cisco Secure Client is listed', async () => {
    // Try visible first
    let svc = await $(`android=new UiSelector().textContains("${SERVICE_NAME}")`)
    if (!(await svc.isExisting())) {
      // Scroll the list of running services if long
      const ok = await scrollTextIntoView(SERVICE_NAME, 10)
      if (!ok) {
        throw new Error(`Expected "${SERVICE_NAME}" in Running services, but it was not found`)
      }
      svc = await $(`android=new UiSelector().textContains("${SERVICE_NAME}")`)
    }
    if (!(await svc.isDisplayed())) {
      throw new Error(`Expected "${SERVICE_NAME}" service not visible after scrolling`)
    }
    // Success screenshot (explicit request)
    await takeAndAttachScreenshot('Cisco Secure Client - Running Services')
  })

  // === NEW: capture nvmagent logs now that service is confirmed running ===
  await step('Capture nvmagent logs (after service check)', async () => {
    // Clear old logs first so we only capture “fresh” lines
    await runCmd('adb logcat -c').catch(() => {})
    await sleep(3000) // give the service a few seconds to emit logs

    const lines = await readNvmAgentLogs()
    allure.addAttachment(
      'nvmagent logs (post-service-check)',
      lines || '(no nvmagent lines found yet)',
      'text/plain'
    )
  })
}

/* ---------- The Test (kept runnable by itself) ---------- */
if (!process.env.E2E_CHAIN) {
describe('Verify Cisco Secure Client [NVM] service is running', () => {
  it('navigates to Running Services and checks Cisco Secure Client', async () => {
    await runCheckNvmService()
  })
})
}
