// test/specs/nvm-service-check.e2e.ts
import { driver, $ } from '@wdio/globals'
import allure from '@wdio/allure-reporter'
import { step } from '../utils/report'


const SETTINGS_PKG = 'com.android.settings'
const SERVICE_NAME = 'Cisco Secure Client'
const FLOW = process.env.CURRENT_FLOW || 'Adhoc';
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

// --- new: read nvmagent logs helper ---
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(_exec)

async function runCmd(cmd: string) {
  const full = process.platform === 'win32' ? `cmd /c ${cmd}` : cmd
  return exec(full, { maxBuffer: 10 * 1024 * 1024 })
}

async function readNvmAgentLogsWithRetry(tries = 3, delayMs = 2000): Promise<string> {
  const isWin = process.platform === 'win32'
  const cmd = isWin
    ? `adb logcat -v time -d | findstr /i /c:"nvmagent"`
    : `adb logcat -v time -d | grep -i "nvmagent" || true`

  let last = ''
  for (let i = 0; i < tries; i++) {
    try {
      const { stdout } = await runCmd(cmd)
      const out = (stdout || '').trim()
      if (out) return out
      last = out
    } catch {
      last = ''
    }
    await sleep(delayMs)
  }
  return last || '(no nvmagent lines found yet)'
}

export async function runCheckNvmService() {
  await step('Open Android Settings', async () => {
    await driver.activateApp(SETTINGS_PKG)
    await sleep(800)
  })

  await step('Go to Developer options', async () => {
    const found = await scrollTextIntoView('Developer options', 12)
    if (found) {
      await tapIfText(/^Developer options$/i, 2000)
    } else {
      await openDeveloperOptionsDirect()
    }
    const marker =
      await tapIfText(/Running services/i, 1000) ||
      (await $(`android=new UiSelector().textMatches("(?i)Running services")`).isExisting()) ||
      (await $(`android=new UiSelector().textMatches("(?i)Developer options")`).isExisting())
    if (!marker) {
      throw new Error('Developer options did not open (could not see expected entries)')
    }
  })

  await step('Open Running services', async () => {
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
    let svc = await $(`android=new UiSelector().textContains("${SERVICE_NAME}")`)
    if (!(await svc.isExisting())) {
      const ok = await scrollTextIntoView(SERVICE_NAME, 10)
      if (!ok) {
        throw new Error(`Expected "${SERVICE_NAME}" in Running services, but it was not found`)
      }
      svc = await $(`android=new UiSelector().textContains("${SERVICE_NAME}")`)
    }
    if (!(await svc.isDisplayed())) {
      throw new Error(`Expected "${SERVICE_NAME}" service not visible after scrolling`)
    }
    await takeAndAttachScreenshot('Cisco Secure Client - Running Services')
  })

  // --- new: capture nvmagent logs ---
  await step('Capture nvmagent logs (while service is running)', async () => {
    await sleep(1000)
    const txt = await readNvmAgentLogsWithRetry(4, 1500)
    allure.addAttachment('nvmagent logcat (service check)', txt, 'text/plain')
  })
}

/* ---------- The Test (kept runnable by itself) ---------- */

  describe(`Verify Cisco Secure Client [NVM] service is running`, () => {
    it('navigates to Running Services and checks Cisco Secure Client', async () => {
      await runCheckNvmService()
    })
  })

