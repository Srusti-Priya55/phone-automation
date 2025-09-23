// test/specs/unregister-profile.e2e.ts
import { $, $$, driver } from '@wdio/globals'
import allure from '@wdio/allure-reporter'
import { Status } from 'allure-js-commons'
import { feature, story, severity } from '../utils/report'
import { step } from '../utils/report'
import { FLOW_SUFFIX } from '../utils/flow';
import { clearRecents, forceStopKnoxIfConfigured, ensureKnoxAtRoot } from '../utils/app-reset'

/* ---------------- shared helpers (unchanged style) ---------------- */

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

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
        for (const el of els) if (await el.isDisplayed()) return true
      } catch {}
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
        if (await el.isDisplayed()) { await el.click(); await sleep(200); return true }
      }
    } catch {}
    await sleep(300)
  }
  return false
}

/** Open Knox SDK Test Tool from Samsung app drawer (same behavior you had). */
async function openAppFromDrawer(appName: string, pageLimit = 8): Promise<boolean> {
  await driver.execute('mobile: pressKey', { keycode: 3 }) // HOME
  await sleep(600)

  // swipe up → drawer
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

    // next page →
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

/* ---------------- specific helpers for THIS test ---------------- */

async function findUnregisterDropdown(): Promise<WebdriverIO.Element> {
  // Anchor row text
  const anchor = await $(`android=new UiSelector().textMatches("(?i)^GET\\s+ALL\\s+PROFILES$")`)
  await anchor.waitForDisplayed({ timeout: 8000 })

  const aLoc  = await anchor.getLocation()
  const aSize = await anchor.getSize()
  const anchorMidY = aLoc.y + Math.floor(aSize.height / 2)

  // All "Select profile name" labels currently visible
  const candidates = await $$(`android=new UiSelector().textMatches("(?i)^Select\\s+profile\\s+name$")`)
  if (!candidates.length) throw new Error('No "Select profile name" dropdowns found')

  // Keep only those **below** the anchor (unregister block) and pick the closest
  const below: { el: WebdriverIO.Element; y: number }[] = []
  for (const el of candidates) {
    const loc = await el.getLocation()
    const size = await el.getSize()
    const midY = loc.y + Math.floor(size.height / 2)
    if (midY > anchorMidY) below.push({ el, y: loc.y })
  }
  if (!below.length) {
    throw new Error('No "Select profile name" found below "GET ALL PROFILES"')
  }
  below.sort((a, b) => a.y - b.y)
  return below[0].el
}
/** Super-robust wait for “…result = 0” after tapping UNREGISTER CLIENT. */
async function waitForUnregisterResultZero(timeoutMs = 10000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs

  // Accept multiple spellings / spacings / separators
  const patterns: RegExp[] = [
    /un.?registration.*result\s*[:=]\s*0/i, // Unregistration / Un-registration
    /unegistration.*result\s*[:=]\s*0/i,    // missing "r"
    /\bresult\s*[:=]\s*0\b/i                // loose fallback
  ]

  // Little helper
  const textMatchesAny = (txt: string) => patterns.some(rx => rx.test(txt))

  while (Date.now() < deadline) {
    // 1) Native Toast (sometimes available)
    try {
      const toast = await $('//android.widget.Toast')
      if (await toast.isDisplayed()) {
        const t = (await toast.getText()).trim()
        if (textMatchesAny(t)) return true
      }
    } catch { /* toast not present → ignore */ }

    // 2) Visible text nodes that look like snackbars/labels
    try {
      // common snackbar content class ends in TextView as well; check both
      const maybeTexts = await $$(
        '//android.widget.TextView | //android.view.View[contains(@content-desc,"result")]'
      )
      for (const el of maybeTexts) {
        if (await el.isDisplayed()) {
          const t = (await el.getText()).trim()
          if (t && textMatchesAny(t)) return true
        }
      }
    } catch { /* ignore and continue */ }

    // 3) Page-source sweep (catches transient custom views)
    try {
      const xml = await driver.getPageSource()
      if (textMatchesAny(xml)) return true
    } catch { /* ignore */ }

    await driver.pause(120) // tight polling to catch short-lived banners
  }
  return false
}


/** Choose the first real profile (skips placeholders like "Select profile name" / "Custom Profile Name"). */
async function chooseFirstRealProfileOption() {
  const items = await $$(
    `//android.widget.ListView//android.widget.CheckedTextView | //android.widget.ListView//android.widget.TextView`
  )
  if (!items.length) throw new Error('Profile list opened but no items present')

  for (const el of items) {
    const txt = (await el.getText()).trim()
    if (!txt) continue
    if (/^select\s+profile\s+name$/i.test(txt)) continue
    if (/^custom\s+profile\s+name$/i.test(txt)) continue
    await el.click()
    await sleep(200)
    return
  }
  throw new Error('Only placeholder/custom items found in profile list')
}

/* ---------------- reusable runner ---------------- */

export async function runUnregisterProfile() {
  await clearRecents()
  await forceStopKnoxIfConfigured()
  const APP_LABEL = 'Knox SDK Test Tool'

  await step('Open Knox SDK Test Tool from drawer', async () => {
    const opened = await openAppFromDrawer(APP_LABEL, 10)
    if (!opened) throw new Error('Could not open Knox SDK Test Tool')
  })

  await step('Go to "Knox Policies List" → "Network Analytics"', async () => {
    if (!(await tapIfVisibleText(/Network Analytics/i, 2000))) {
      await tapIfVisibleText(/Knox Policies List/i, 3000)
      if (!(await tapIfVisibleText(/Network Analytics/i, 4000))) {
        await tapIfVisibleText(/Knox Tests/i, 2000)
        if (!(await tapIfVisibleText(/Network Analytics/i, 4000))) {
          throw new Error('Could not reach "Network Analytics" screen')
        }
      }
    }
  })

  await step('Open the *second* "Select profile name"', async () => {
    const spinner = await findUnregisterDropdown()
    await spinner.click()
    await sleep(300)
  })

  await step('Choose the first real profile option', async () => {
    await chooseFirstRealProfileOption()
  })

  await step('Tap "UNREGISTER CLIENT"', async () => {
    const btn = await $(`android=new UiSelector().textMatches("(?i)^UNREGISTER\\s+CLIENT$")`)
    await btn.waitForDisplayed({ timeout: 8000 })
    await btn.click()
  })

  await step('Validate "Unregistration result = 0"', async () => {
    const ok = await waitForUnregisterResultZero(10000)
    
    if (!ok) {
      await takeAndAttachScreenshot('Unregister result not found')
      throw new Error('Did not observe success message (…result = 0) within 10s')
    }
    await clearRecents()
   
  })
}

/* ---------------- the test (with Jenkins-friendly tags) ---------------- */

describe('Unregister NVM Profile)'+ FLOW_SUFFIX, () => {
  before(() => {
    feature('NVM')
    story('Unregister profile using 2nd dropdown below "GET ALL PROFILES"')
    severity('normal')
  })

  it('opens SDK → Network Analytics → selects 2nd dropdown → first profile → UNREGISTER → sees result=0', async () => {
    await runUnregisterProfile()
  })
})

