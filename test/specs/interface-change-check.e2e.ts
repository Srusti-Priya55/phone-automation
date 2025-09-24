// interface-change-check.e2e.ts
import { driver } from '@wdio/globals' 
import allure from '@wdio/allure-reporter'
import { Status } from 'allure-js-commons'
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'


const exec = promisify(_exec)
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))
const FLOW = process.env.CURRENT_FLOW || 'Adhoc';
/* ---------- utilities ---------- */
async function run(cmd: string) {
  const full = process.platform === 'win32' ? `cmd /c ${cmd}` : cmd
  return exec(full, { maxBuffer: 20 * 1024 * 1024 })
}

async function takeShot(name: string) {
  const b64 = await driver.takeScreenshot()
  allure.addAttachment(name, Buffer.from(b64, 'base64'), 'image/png')
}

async function attachText(name: string, text: string) {
  allure.addAttachment(name, text, 'text/plain')
}

async function step<T>(title: string, fn: () => Promise<T>): Promise<T> {
  allure.startStep(title)
  try {
    const out = await fn()
    allure.endStep(Status.PASSED)
    return out
  } catch (e) {
    await takeShot(`${title} (failed)`)
    allure.endStep(Status.FAILED)
    throw e
  }
}

/** Expand Quick Settings for screenshots */
async function openQuickSettings() {
  try {
    await run(`adb shell cmd statusbar expand-settings`)
  } catch {
    const { width, height } = await driver.getWindowRect()
    const x = Math.floor(width / 2)
    await driver.performActions([{
      type: 'pointer', id: 'swipe1', parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x, y: Math.floor(height * 0.01) },
        { type: 'pointerDown', button: 0 },
        { type: 'pointerMove', duration: 500, x, y: Math.floor(height * 0.65) },
        { type: 'pointerUp', button: 0 }
      ]
    }])
  }
  await sleep(800)
}

/** Only capture nvmagent InterfaceChange lines */
async function readInterfaceChangeLogs(): Promise<string> {
  const filter = process.platform === 'win32'
    ? `adb logcat -d | findstr /i nvmagent`
    : `adb logcat -d | grep -i nvmagent || true`

  const { stdout } = await run(filter).catch(() => ({ stdout: '' }))
  const lines = stdout.split(/\r?\n/)

  // keep only interface-change related lines
  const wanted = lines.filter(l =>
    /Received interface change notification/i.test(l) ||
    /Interface change notified/i.test(l) ||
    /Interface change signal received/i.test(l)
  )

  return wanted.join('\n') || '(no InterfaceChange lines found)'
}

/* ---------- the test ---------- */

  describe(`Interface Change Check`, () => {

    it('disables and re-enables Wi-Fi, then verifies InterfaceChange logs', async () => {
      await step('Clear previous logcat buffer', async () => {
        await run(`adb logcat -c`)
      })

      await step('Turn Wi-Fi OFF and check logs', async () => {
        await run(`adb shell svc wifi disable`)
        await sleep(3000)
        await openQuickSettings()
        const txt = await readInterfaceChangeLogs()
        await attachText('InterfaceChange logs after Wi-Fi OFF', txt)
      })

      await step('Clear logs again', async () => {
        await run(`adb logcat -c`)
      })

      await step('Turn Wi-Fi ON and check logs', async () => {
        await run(`adb shell svc wifi enable`)
        await sleep(4000)
        await openQuickSettings()
        const txt = await readInterfaceChangeLogs()
        await attachText('InterfaceChange logs after Wi-Fi ON', txt)
      })
    })
  })


export async function runInterfaceChangeCheck() {
  await step('Clear previous logcat buffer', async () => {
    await sleep(3000)
    await run(`adb logcat -c`)
  })

  await step('Turn Wi-Fi OFF and check logs', async () => {
    await run(`adb shell svc wifi disable`)
    await sleep(3000)
    await openQuickSettings()
    const txt = await readInterfaceChangeLogs()
    await attachText('InterfaceChange logs after Wi-Fi OFF', txt)
  })

  await step('Clear logs again', async () => {
    await run(`adb logcat -c`)
  })

  await step('Turn Wi-Fi ON and check logs', async () => {
    await run(`adb shell svc wifi enable`)
    await sleep(4000)
    await openQuickSettings()
    const txt = await readInterfaceChangeLogs()
    await attachText('InterfaceChange logs after Wi-Fi ON', txt)
  })

  await step('NVM logcat', async () => {
  const cmd = process.platform === 'win32'
    ? 'adb logcat -d | findstr /i nvmagent'
    : 'adb logcat -d | grep -i nvmagent || true'
  await sleep(8000)
  const { stdout } = await run(cmd).catch(() => ({ stdout: '' }))
  await attachText('NVM logcat', stdout || '(no nvmagent lines found)')
})

}
