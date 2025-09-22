// test/specs/push-and-register.e2e.ts
import { $, $$, driver } from '@wdio/globals'
import allure from '@wdio/allure-reporter'
import { Status } from 'allure-js-commons'
import path from 'node:path'
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
import { step } from '../utils/report'
import { clearRecents, forceStopKnoxIfConfigured, ensureKnoxAtRoot } from '../utils/app-reset'



const exec = promisify(_exec)

/* ---------------- utilities ---------------- */
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

async function runCmd(cmd: string) {
  const full = process.platform === 'win32' ? `cmd /c ${cmd}` : cmd
  return exec(full, { maxBuffer: 10 * 1024 * 1024 })
}

async function adbPush(localAbs: string, remoteAbs: string) {
  await runCmd(`adb push "${localAbs}" "${remoteAbs}"`)
}

async function takeAndAttachScreenshot(name: string) {
  const b64 = await driver.takeScreenshot()
  allure.addAttachment(name, Buffer.from(b64, 'base64'), 'image/png')
}

async function waitForAnyText(regexes: RegExp[], timeoutMs: number): Promise<boolean> {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    for (const rgx of regexes) {
      try {
        const els = await $$(`android=new UiSelector().textMatches("${rgx.source}")`)
        for (const el of els) {
          if (await el.isDisplayed()) return true
        }
      } catch { /* ignore and retry */ }
    }
    await sleep(300)
  }
  return false
}

async function tapIfVisibleText(regex: RegExp, timeout = 3000): Promise<boolean> {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    try {
      const els = await $$(`android=new UiSelector().textMatches("${regex.source}")`)
      for (const el of els) {
        if (await el.isDisplayed()) {
          await el.click()
          await sleep(200)
          return true
        }
      }
    } catch { /* ignore */ }
    await sleep(300)
  }
  return false
}

/** Open an app from Samsung app drawer by label (swipe up → swipe left pages → tap label). */
async function openAppFromDrawer(appName: string, pageLimit = 8): Promise<boolean> {
  await driver.execute('mobile: pressKey', { keycode: 3 }) // HOME
  await sleep(600)

  // swipe up to open drawer
  const { width, height } = await driver.getWindowSize()
  const upStart = { x: Math.floor(width / 2), y: Math.floor(height * 0.88) }
  const upEnd   = { x: Math.floor(width / 2), y: Math.floor(height * 0.20) }
  await driver.performActions([{
    type: 'pointer', id: 'finger-open', parameters: { pointerType: 'touch' },
    actions: [
      { type: 'pointerMove', duration: 0, x: upStart.x, y: upStart.y },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: 150 },
      { type: 'pointerMove', duration: 300, x: upEnd.x, y: upEnd.y },
      { type: 'pointerUp', button: 0 }
    ]
  }])
  await sleep(700)

  const midY = Math.floor(height * 0.45)
  const leftStartX = Math.floor(width * 0.85)
  const leftEndX   = Math.floor(width * 0.15)

  for (let i = 0; i < pageLimit; i++) {
    const label = await $(`android=new UiSelector().text("${appName}")`)
    if (await label.isExisting() && await label.isDisplayed()) {
      await label.click()
      const appeared = await waitForAnyText(
        [/Knox Policies List/i, /Knox Tests/i, /Network Analytics/i],
        5000
      )
      if (appeared) return true
    }

    // swipe left for next page
    await driver.performActions([{
      type: 'pointer', id: 'finger-left', parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: leftStartX, y: midY },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 120 },
        { type: 'pointerMove', duration: 280, x: leftEndX, y: midY },
        { type: 'pointerUp', button: 0 }
      ]
    }])
    await sleep(700)
  }
  return false
}

/* ----------- TND log helpers (added) ----------- */

/** Get only TND-related lines from nvmagent logcat output. */
async function readTndLogs(): Promise<string> {
  const grepCmd = process.platform === 'win32'
    ? `adb logcat -d | findstr /i nvmagent`
    : `adb logcat -d | grep -i nvmagent || true`
  const { stdout } = await runCmd(grepCmd).catch(() => ({ stdout: '' }))

  const lines = (stdout || '').split(/\r?\n/)

  // Keep the most relevant TND events/keywords
  const wanted = lines.filter(l =>
    /TrustedNetworkDetection/i.test(l) ||              // component name
    /pollTrustedServer/i.test(l) ||
    /authenticateTNDServer/i.test(l) ||
    /Trusted Server/i.test(l) ||
    /certificate/i.test(l) ||
    /TND/i.test(l) // generic safety net
  )

  return wanted.join('\n') || '(no TND-related lines found)'
}

async function wifi(state: 'enable'|'disable') {
  await runCmd(`adb shell svc wifi ${state}`)
}

/* ---------------- the test ---------------- */

describe('TND Check- Push and Register NVM Profile', () => {
  const PROFILE_LOCAL  = path.resolve(__dirname, '../../apps/nap_json3.txt')
  const PROFILE_REMOTE = '/sdcard/nap_json3.txt'
  const APP_LABEL      = 'Knox SDK Test Tool'

  before(() => {
    allure.addFeature('Profile Management')
    allure.addStory('Push + Register NVM profile + TND log check via Wi-Fi toggle')
    allure.addSeverity('normal')
  })

  it('pushes profile, opens Knox SDK tool, selects it, registers, toggles Wi-Fi and captures TND logs', async () => {
    await clearRecents()
    await forceStopKnoxIfConfigured()
    await step('Push JSON profile to device', async () => {
      await adbPush(PROFILE_LOCAL, PROFILE_REMOTE)
    })

    await step('Launch Knox SDK Test Tool', async () => {
      const opened = await openAppFromDrawer(APP_LABEL, 10)
      if (!opened) throw new Error('Could not launch Knox SDK Test Tool from drawer')
    })

    await step('Navigate to Network Analytics', async () => {
      await tapIfVisibleText(/Knox Policies List/i, 4000)
      if (!(await tapIfVisibleText(/Network Analytics/i, 5000))) {
        await tapIfVisibleText(/Knox Tests/i, 2000)
        await tapIfVisibleText(/Network Analytics/i, 5000)
      }
    })

    await step('Select pushed profile file', async () => {
      await tapIfVisibleText(/^Select JSON file location$/i, 4000)
      if (!(await tapIfVisibleText(/\/sdcard\/nap_json3\.txt/i, 5000))) {
        throw new Error('Profile file not selectable under /sdcard/')
      }
    })

    await step('Register client', async () => {
      if (!(await tapIfVisibleText(/^REGISTER CLIENT$/i, 6000))) {
        throw new Error('REGISTER CLIENT button not found or not clickable')
      }
      await sleep(800)
    })

    // --------- New: Wi-Fi toggling and TND log capture ---------

    await step('Clear logcat before TND capture', async () => {
      await runCmd(`adb logcat -c`)
    })

    await step('Turn Wi-Fi OFF and capture TND logs', async () => {
      await wifi('disable')
      await sleep(3000)
      const txt = await readTndLogs()
      allure.addAttachment('TND logs after Wi-Fi OFF', txt, 'text/plain')
      await runCmd(`adb logcat -c`)
    })

    await step('Turn Wi-Fi ON and capture TND logs', async () => {
      await wifi('enable')
      await sleep(5000)
      const txt = await readTndLogs()
      allure.addAttachment('TND logs after Wi-Fi ON', txt, 'text/plain')
    })
  })
})
