// test/specs/push-and-register-etc.e2e.ts
import { $, $$, driver } from '@wdio/globals'
import allure from '@wdio/allure-reporter'
import path from 'node:path'
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
import { step } from '../utils/report'
import { clearRecents, forceStopKnoxIfConfigured } from '../utils/app-reset'

const exec = promisify(_exec)
const FLOW = process.env.CURRENT_FLOW || 'Adhoc'

/* ---------------- tweak just these if needed ---------------- */
const JSON_LOCAL_FILE   = path.resolve(__dirname, '../../apps/nap_json6.txt') // file you push
const JSON_REMOTE_FILE  = '/sdcard/nap_json6.txt'
const JSON_PATH_TO_TYPE = '/sdcard/nap_json6.txt' // <— the path you want to type
const APP_LABEL         = 'Knox SDK Test Tool'

/* ---------------- utilities (same style as your working spec) ---------------- */
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
      } catch {}
    }
    await sleep(300)
  }
  return false
}
async function waitForRegisterResultZero(timeoutMs = 10000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  const patterns: RegExp[] = [
    /Registration.*result\s*[:=]\s*0/i,
    /\bresult\s*[:=]\s*0\b/i
  ]
  const textMatchesAny = (txt: string) => patterns.some(rx => rx.test(txt))
  while (Date.now() < deadline) {
    try {
      const toast = await $('//android.widget.Toast')
      if (await toast.isDisplayed()) {
        const t = (await toast.getText()).trim()
        if (textMatchesAny(t)) return true
      }
    } catch {}
    try {
      const maybeTexts = await $$('//android.widget.TextView | //android.view.View[contains(@content-desc,"result")]')
      for (const el of maybeTexts) {
        if (await el.isDisplayed()) {
          const t = (await el.getText()).trim()
          if (t && textMatchesAny(t)) return true
        }
      }
    } catch {}
    try {
      const xml = await driver.getPageSource()
      if (textMatchesAny(xml)) return true
    } catch {}
    await driver.pause(120)
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
    } catch {}
    await sleep(300)
  }
  return false
}
/** Open app from drawer (unchanged) */
async function openAppFromDrawer(appName: string, pageLimit = 8): Promise<boolean> {
  await driver.execute('mobile: pressKey', { keycode: 3 }) // HOME
  await sleep(600)
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

/* ---------------- test ---------------- */
describe(`${FLOW} - Push and Register NVM Profile (etc + typed path)`, () => {
  it('pushes file, opens Knox SDK tool, selects etc, types path, and registers', async () => {
    await runPushAndRegister_ETC_TypePath()
  })
})

/* ---------------- runner (only the typing bit is enhanced) ---------------- */
export async function runPushAndRegister_ETC_TypePath() {
  await clearRecents()
  await forceStopKnoxIfConfigured()

  await step('Push JSON profile to device', async () => {
    await adbPush(JSON_LOCAL_FILE, JSON_REMOTE_FILE)
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

  await step('Select "etc" under Select JSON file location', async () => {
    if (!(await tapIfVisibleText(/^Select JSON file location$/i, 4000))) {
      await takeAndAttachScreenshot('select-json-location-missing')
      throw new Error('"Select JSON file location" not found')
    }
    if (!(await tapIfVisibleText(/^etc$/i, 4000))) {
      await takeAndAttachScreenshot('etc-option-missing')
      throw new Error('"etc" option not found in dropdown')
    }
  })

  await step('Focus "JSON File Location" and type the path (multi-strategy)', async () => {
    // Bring label on-screen
    try {
      await $(`android=new UiScrollable(new UiSelector().scrollable(true))`
        + `.scrollIntoView(new UiSelector().text("JSON File Location"))`)
    } catch {}

    const label = await $(`android=new UiSelector().text("JSON File Location")`)
    if (!(await label.isExisting())) {
      await takeAndAttachScreenshot('json-label-not-found')
      throw new Error('"JSON File Location" label not found')
    }

    // 1) Focus the input by tapping label, then tapping to the right where the input usually sits
    await label.click()
    await driver.pause(200)
    try {
      const loc = await label.getLocation()
      const size = await label.getSize()
      const x = loc.x + Math.floor(size.width * 0.90)
      const y = loc.y + Math.floor(size.height * 0.60)
      await driver.performActions([{
        type: 'pointer', id: 'tap-json-input', parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 }
        ]
      }])
      await driver.releaseActions()
    } catch {}

    // Try #A: setValue on last visible EditText
    const edits = await $$(`android=new UiSelector().className("android.widget.EditText")`)
    if (edits.length) {
      const input = edits[await edits.length - 1]
      try { await input.clearValue() } catch {}
      try {
        await input.setValue(JSON_PATH_TO_TYPE)
      } catch {}
    }

    // Verify if text is present already
    const haveTextNow = async () => {
      try {

        const edits = await $$(`android=new UiSelector().className("android.widget.EditText")`)
        const last = edits.length ? edits[await edits.length - 1] : undefined

        if (last) {
          const val = await last.getText()
          return !!val && val.includes('sdcard')
        }
      } catch {}
      return false
    }
    if (!(await haveTextNow())) {
      // Try #B: send keys to focused view
      try { await driver.keys(JSON_PATH_TO_TYPE) } catch {}
    }

    // Tiny pause + hide keyboard best-effort
    await driver.pause(250)
    try { await driver.hideKeyboard() } catch {}
  })

  await step('Tap REGISTER CLIENT', async () => {
    if (!(await tapIfVisibleText(/^REGISTER CLIENT$/i, 6000))) {
      await takeAndAttachScreenshot('register-client-missing')
      throw new Error('REGISTER CLIENT button not found or not clickable')
    }
    await sleep(400)
  })

  await step('Validate "Registration result = 0"', async () => {
    const ok = await waitForRegisterResultZero(10000)
    if (!ok) {
      await takeAndAttachScreenshot('register-result-missing')
      throw new Error('Did not observe success message (…result = 0) within 10s')
    }
  })
}
