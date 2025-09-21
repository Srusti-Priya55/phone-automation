// test/utils/app-reset.ts
import { $, $$, driver } from '@wdio/globals'
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(_exec)

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

/** Open Android Recents and try to "Close all" (OEM-safe, with fallbacks). */
export async function clearRecents() {
  try {
    // Open Recents
    await driver.execute('mobile: pressKey', { keycode: 187 }) // KEYCODE_APP_SWITCH
    await sleep(600)

    // Try common "Close all" texts
    const labels = [
      /^(Close all|Clear all|Close all apps|Dismiss all)$/i,
      /^(Close all|Clear all)$/i,
    ]
    for (const rx of labels) {
      try {
        const btn = await $(`android=new UiSelector().textMatches("${rx.source}")`)
        if (await btn.isDisplayed()) {
          await btn.click()
          await sleep(300)
          // go Home to be deterministic
          await driver.execute('mobile: pressKey', { keycode: 3 })
          await sleep(400)
          return
        }
      } catch {}
    }

    // Fallback: fling away a few recent cards
    const { width, height } = await driver.getWindowRect()
    const startX = Math.floor(width * 0.80)
    const endX   = Math.floor(width * 0.20)
    const midY   = Math.floor(height * 0.50)

    for (let i = 0; i < 5; i++) {
      await driver.performActions([{
        type: 'pointer', id: `kill-${i}`, parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: startX, y: midY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 200, x: endX, y: midY },
          { type: 'pointerUp', button: 0 },
        ],
      }])
      await sleep(200)
    }
    await driver.execute('mobile: pressKey', { keycode: 3 }) // HOME
    await sleep(300)
  } catch {
    // Non-fatal
  }
}

/**
 * Optional hard stop Knox by package (if you know it).
 * Set env KNOX_PKG to enable: e.g. KNOX_PKG=com.samsung.android.knox.policymanagement
 */
export async function forceStopKnoxIfConfigured() {
  const pkg = process.env.KNOX_PKG?.trim()
  if (!pkg) return
  const cmd = process.platform === 'win32'
    ? `cmd /c adb shell am force-stop ${pkg}`
    : `adb shell am force-stop ${pkg}`
  try { await exec(cmd) } catch {}
  await sleep(250)
}

/**
 * After the app is opened, make sure we are at the Policy Management root.
 * Backs out until we can see "Knox Policies List" / "Knox Tests" / "Policy management".
 */
export async function ensureKnoxAtRoot(maxBacks = 6) {
  // Quick happy paths
  const rootHints = [
    /Policy management/i,
    /Knox Policies List/i,
    /Knox Tests/i,
  ]
  const atRoot = async () => {
    for (const rx of rootHints) {
      try {
        const el = await $(`android=new UiSelector().textMatches("${rx.source}")`)
        if (await el.isDisplayed()) return true
      } catch {}
    }
    return false
  }

  if (await atRoot()) return

  // Back out a few times
  for (let i = 0; i < maxBacks; i++) {
    try { await driver.back() } catch {}
    await sleep(400)
    if (await atRoot()) return
  }
  // If still not at root, it's okay; subsequent steps may still navigate fine.
}
