// test/specs/reboot-and-traffic.e2e.ts
import { driver } from '@wdio/globals'
import { execSync, ExecSyncOptions } from 'node:child_process'

const CHROME_PKG = 'com.android.chrome'

// make the test own its timeout so it never trips the 90s suite setting
const TEST_TIMEOUT_MS = 10 * 60_000   // 10 min hard ceiling for the whole test
const READY_BUDGET_MS = 6 * 60_000    // up to 6 min to get back after reboot
const STEP_PAUSE = 3200               // tiny think time between URL hits

describe('Traffic generation with reboot', function () {
  this.timeout(TEST_TIMEOUT_MS)

  it('generates traffic, reboots device, then generates traffic again', async () => {
    // ---- traffic BEFORE reboot ----
    await openInChrome('https://www.cnn.com/')
    await driver.pause(STEP_PAUSE)
    await openInChrome('https://www.google.com/')
    await driver.pause(STEP_PAUSE)
    await openInChrome('https://www.example.com/')
    await driver.pause(STEP_PAUSE)

    // prevent afterTest screenshot while phone is down
    ;(global as any).__REBOOT_IN_PROGRESS__ = true

    // Close the WDIO session BEFORE reboot so no driver calls occur during boot
    try { await driver.deleteSession({ shutdownDriver: false } as any) } catch {}

    // ---- reboot (ADB only) + minimal readiness gates ----
    await adbSafe(['start-server'])
    log('Rebooting via ADB…')
    adbSafe(['reboot']) // returns immediately

    // 1) physical USB back
    log('Waiting for USB reconnect (adb wait-for-device)…')
    await waitUntil(() => adbSafe(['wait-for-device']).ok, READY_BUDGET_MS, 700, 'USB reconnect')

    // 2) authorization (handle the “Allow USB debugging” prompt if needed)
    await waitAuthorized(READY_BUDGET_MS)

    // 3) device online
    log('Waiting for adb get-state=device…')
    await waitUntil(() => adbOut(['get-state']).includes('device'), READY_BUDGET_MS, 600, 'adb get-state=device')

    // 4) core boot prop (either is fine; ROMs differ)
    log('Waiting for sys.boot_completed=1 OR device_provisioned=1…')
    await waitUntil(() => {
      const bootCompleted = adbOut(['shell', 'getprop', 'sys.boot_completed']).trim() === '1'
      const provisioned   = adbOut(['shell', 'settings', 'get', 'global', 'device_provisioned']).trim() === '1'
      return bootCompleted || provisioned
    }, READY_BUDGET_MS, 800, 'core boot props')

    // Wake & unlock (best-effort)
    adbSafe(['shell', 'input', 'keyevent', '224'])
    adbSafe(['shell', 'input', 'keyevent', '82'])

    // ---- RE-ESTABLISH Appium session (this is the real “ready” check) ----
    await createFreshSessionAndVerify(READY_BUDGET_MS)

    ;(global as any).__REBOOT_IN_PROGRESS__ = false

    // ---- traffic AFTER reboot ----
    await openInChrome('https://www.cisco.com/')
    await driver.pause(STEP_PAUSE)
    await openInChrome('https://www.wikipedia.org/')
    await driver.pause(STEP_PAUSE)
    await openInChrome('https://www.bbc.com/')
    await driver.pause(STEP_PAUSE)
  })
})

/* ---------------- helpers ---------------- */

async function openInChrome(url: string) {
  try {
    // fastest + cleanest
    // @ts-ignore supported by UiAutomator2
    await driver.execute('mobile: deepLink', { url, package: CHROME_PKG })
  } catch {
    // fallback: plain adb intent
    adbSafe(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, CHROME_PKG])
  }
}

function adbOut(args: string[], timeoutMs = 120_000): string {
  const caps = (driver as any)?.capabilities || {}
  const udid = caps['appium:udid'] || process.env.ANDROID_UDID || ''
  const withDevice = udid ? ['-s', udid] : []
  const cmd = ['adb', ...withDevice, ...args].join(' ')
  const opts: ExecSyncOptions = { stdio: 'pipe', timeout: timeoutMs }
  try { return execSync(cmd, opts).toString() }
  catch { return '' }
}
function adbSafe(args: string[], timeoutMs = 120_000) {
  try { adbOut(args, timeoutMs); return { ok: true } }
  catch { return { ok: false } }
}

function log(s: string) { console.log(`[REBOOT] ${s}`) }
async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function waitUntil(cond: () => boolean, budgetMs: number, everyMs: number, label: string) {
  const stop = Date.now() + budgetMs
  while (Date.now() < stop) {
    try { if (cond()) return } catch {}
    await sleep(everyMs)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function waitAuthorized(budgetMs: number) {
  log('Checking device authorization…')
  const stop = Date.now() + budgetMs
  while (Date.now() < stop) {
    const out = adbOut(['devices'])
    if (/^\S+\s+device$/m.test(out)) { log('Device is authorized.'); return }
    if (/^\S+\s+unauthorized$/m.test(out)) {
      log('ADB unauthorized. Please tap “Allow USB debugging”…')
      await sleep(1000)
      continue
    }
    await sleep(600)
  }
  throw new Error('Timed out waiting for device authorization.')
}

// Keep asking Appium for a session until UiAutomator2 is live
async function createFreshSessionAndVerify(budgetMs: number) {
  log('Creating fresh Appium session…')
  const stop = Date.now() + budgetMs
  let attempt = 0

  while (Date.now() < stop) {
    attempt++
    try {
      await driver.reloadSession()        // creates new session if none
      await driver.getWindowRect()        // proves UiAutomator2 is responding
      log(`Fresh session established (attempt ${attempt}).`)
      return
    } catch (e: any) {
      const msg = String(e?.message || e)
      // common transient errors right after boot; just retry
      if (/(instrumentation process|UiAutomator|refused|closed|terminated|ECONN|Socket)/i.test(msg)) {
        await sleep(1200)
        continue
      }
      // unknown hiccup — brief backoff and keep going
      await sleep(1200)
    }
  }

  // last attempt; let it throw if still not ready
  await driver.reloadSession()
  await driver.getWindowRect()
}
