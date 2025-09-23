// test/specs/neg-reregister-then-unregister.e2e.ts
import { $, $$, driver } from '@wdio/globals'
import allure from '@wdio/allure-reporter'
import path from 'node:path'
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
import { step } from '../utils/report'
import { clearRecents, forceStopKnoxIfConfigured } from '../utils/app-reset'
import { labelSection } from '../utils/flow'

const exec = promisify(_exec)
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))
const FLOW = process.env.CURRENT_FLOW || 'Adhoc';
/* ---------- common helpers ---------- */
async function runCmd(cmd: string) {
  const full = process.platform === 'win32' ? `cmd /c ${cmd}` : cmd
  return exec(full, { maxBuffer: 10 * 1024 * 1024 })
}
async function adbPush(localAbs: string, remoteAbs: string) {
  await runCmd(`adb push "${localAbs}" "${remoteAbs}"`)
}
async function tapIfVisibleText(regex: RegExp, timeout = 3000): Promise<boolean> {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    try {
      const els = await $$(`android=new UiSelector().textMatches("${regex.source}")`)
      for (const el of els) {
        if (await el.isDisplayed()) {
          await el.click()
          await sleep(150)
          return true
        }
      }
    } catch {}
    await sleep(250)
  }
  return false
}
async function waitForResult(expected: number, timeoutMs = 10000): Promise<boolean> {
  const pats = [
    new RegExp(`Registration.*result\\s*[:=]\\s*${expected}`, 'i'),
    new RegExp(`Un.?registration.*result\\s*[:=]\\s*${expected}`, 'i'),
    new RegExp(`\\bresult\\s*[:=]\\s*${expected}\\b`, 'i'),
  ]
  const matches = (t: string) => pats.some(rx => rx.test(t))
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    try {
      const toast = await $('//android.widget.Toast')
      if (await toast.isDisplayed()) {
        const t = (await toast.getText()).trim()
        if (matches(t)) return true
      }
    } catch {}
    try {
      const nodes = await $$('//android.widget.TextView | //android.view.View[contains(@content-desc,"result")]')
      for (const n of nodes) {
        if (await n.isDisplayed()) {
          const t = (await n.getText()).trim()
          if (t && matches(t)) return true
        }
      }
    } catch {}
    try {
      const xml = await driver.getPageSource()
      if (matches(xml)) return true
    } catch {}
    await driver.pause(150)
  }
  return false
}
async function openAppFromDrawer(appName: string, pageLimit = 8): Promise<boolean> {
  await driver.execute('mobile: pressKey', { keycode: 3 }) // HOME
  await sleep(500)
  const { width, height } = await driver.getWindowSize()
  const upStart = { x: Math.floor(width/2), y: Math.floor(height*0.88) }
  const upEnd   = { x: Math.floor(width/2), y: Math.floor(height*0.20) }
  await driver.performActions([{
    type: 'pointer', id: 'open', parameters: { pointerType: 'touch' },
    actions: [
      { type:'pointerMove', duration:0, x:upStart.x, y:upStart.y },
      { type:'pointerDown', button:0 },
      { type:'pause', duration:120 },
      { type:'pointerMove', duration:280, x:upEnd.x, y:upEnd.y },
      { type:'pointerUp', button:0 }
    ]}])
  await sleep(600)

  const midY = Math.floor(height*0.45)
  const leftStartX = Math.floor(width*0.85)
  const leftEndX   = Math.floor(width*0.15)

  for (let i=0; i<pageLimit; i++) {
    const label = await $(`android=new UiSelector().text("${appName}")`)
    if (await label.isExisting() && await label.isDisplayed()) {
      await label.click()
      return true
    }
    await driver.performActions([{
      type:'pointer', id:'page', parameters:{pointerType:'touch'},
      actions:[
        {type:'pointerMove', duration:0, x:leftStartX, y:midY},
        {type:'pointerDown', button:0},
        {type:'pause', duration:100},
        {type:'pointerMove', duration:240, x:leftEndX, y:midY},
        {type:'pointerUp', button:0}
      ]}])
    await sleep(600)
  }
  return false
}
/* --- unregister helpers --- */
async function findUnregisterDropdown(): Promise<WebdriverIO.Element> {
  const anchor = await $(`android=new UiSelector().textMatches("(?i)^GET\\s+ALL\\s+PROFILES$")`)
  await anchor.waitForDisplayed({ timeout: 8000 })
  const aLoc  = await anchor.getLocation()
  const aSize = await anchor.getSize()
  const anchorMidY = aLoc.y + Math.floor(aSize.height/2)
  const candidates = await $$(`android=new UiSelector().textMatches("(?i)^Select\\s+profile\\s+name$")`)
  if (!candidates.length) throw new Error('No "Select profile name" found')
  const below: { el: WebdriverIO.Element; y: number }[] = []
  for (const el of candidates) {
    const loc = await el.getLocation()
    const size = await el.getSize()
    const midY = loc.y + Math.floor(size.height/2)
    if (midY > anchorMidY) below.push({ el, y: loc.y })
  }
  below.sort((a,b)=>a.y-b.y)
  return below[0].el
}
async function chooseFirstRealProfileOption() {
  const items = await $$('//android.widget.ListView//android.widget.CheckedTextView | //android.widget.ListView//android.widget.TextView')
  for (const el of items) {
    const txt = (await el.getText()).trim()
    if (!txt) continue
    if (/^select\s+profile\s+name$/i.test(txt)) continue
    if (/^custom\s+profile\s+name$/i.test(txt)) continue
    await el.click()
    await sleep(200)
    return
  }
  throw new Error('No real profile in list')
}

/* ---------- the test ---------- */
describe(`${FLOW} - Negative flow: Register (0) → Re-register (-6) → Unregister (0)`, () => {
  before(() => labelSection('Negative -Re-register same profile'))
  const PROFILE_LOCAL  = path.resolve(__dirname, '../../apps/nap_json1.txt')
  const PROFILE_REMOTE = '/sdcard/nap_json1.txt'
  const APP_LABEL      = 'Knox SDK Test Tool'

  it('does the full cycle', async () => {
    await clearRecents()
    await forceStopKnoxIfConfigured()

    // --- Register first time (expect 0) ---
    await step('Push + Register', async () => {
      await adbPush(PROFILE_LOCAL, PROFILE_REMOTE)
      await openAppFromDrawer(APP_LABEL, 10)
      await tapIfVisibleText(/Knox Policies List/i, 2000)
      await tapIfVisibleText(/Network Analytics/i, 4000)
      await tapIfVisibleText(/^Select JSON file location$/i, 4000)
      await tapIfVisibleText(/\/sdcard\/nap_json1\.txt/i, 4000)
      await tapIfVisibleText(/^REGISTER CLIENT$/i, 4000)
      if (!(await waitForResult(0, 10000))) throw new Error('Expected result=0 not observed')
    })

    await clearRecents()
    await forceStopKnoxIfConfigured()

    // --- Re-register same (expect -6) ---
    await step('Re-register same JSON', async () => {
      await openAppFromDrawer(APP_LABEL, 10)
      await tapIfVisibleText(/Knox Policies List/i, 2000)
      await tapIfVisibleText(/Network Analytics/i, 4000)
      await tapIfVisibleText(/^Select JSON file location$/i, 4000)
      await tapIfVisibleText(/\/sdcard\/nap_json1\.txt/i, 4000)
      await tapIfVisibleText(/^REGISTER CLIENT$/i, 4000)
      if (!(await waitForResult(-6, 10000))) throw new Error('Expected result=-6 not observed')
    })

    // --- Unregister via 2nd dropdown ---
    await step('Unregister original profile', async () => {
      const spinner = await findUnregisterDropdown()
      await spinner.click()
      await chooseFirstRealProfileOption()
      await tapIfVisibleText(/^UNREGISTER CLIENT$/i, 5000)
      if (!(await waitForResult(0, 10000))) throw new Error('Expected Unregistration result=0 not observed')
    })
  })
})
