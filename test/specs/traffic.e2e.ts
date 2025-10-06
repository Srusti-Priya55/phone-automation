// test/specs/traffic.e2e.ts
import { driver } from '@wdio/globals'

const CHROME_PKG = 'com.android.chrome'
const YT_PKG     = 'com.google.android.youtube'
const MAPS_PKG   = 'com.google.android.apps.maps'
const GMAIL_PKG  = 'com.google.android.gm'
const STORE_PKG  = 'com.android.vending'
const FLOW = process.env.CURRENT_FLOW || 'Adhoc';

describe(`${FLOW}-Traffic generation`, () => {
  it('opens multiple apps and sites to generate traffic', async () => {
    // ----- Chrome traffic -----
    await openInChrome('https://www.cnn.com/')
    await driver.pause(3000)

    await openInChrome('https://www.google.com/')
    await driver.pause(3000)

    await openInChrome('https://www.wikipedia.org/')
    await driver.pause(3000)

    // ----- YouTube traffic -----
    await openApp(YT_PKG, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await driver.pause(5000)

    // ----- Google Maps traffic -----
    await openApp(MAPS_PKG)
    await driver.pause(2000)


    await openApp(STORE_PKG)
    await driver.pause(5000)
    await scrollGesture('up')
    await scrollGesture('down')
  })
})

/* ---------------- helpers ---------------- */

async function pauseShort(ms = 1200) {
  await driver.pause(ms)
}

async function openInChrome(url: string) {
  // @ts-ignore - mobile: deepLink is supported by Appium UiAutomator2
  await driver.execute('mobile: deepLink', {
    url,
    package: CHROME_PKG,
  })
  await pauseShort(2000)
}

// Open an app by package; if url provided, use deep link
async function openApp(pkg: string, url?: string) {
  if (url) {
    // @ts-ignore
    await driver.execute('mobile: deepLink', { url, package: pkg })
  } else {
    await driver.activateApp(pkg)
  }
  await pauseShort(3000)
}

async function scrollGesture(direction: 'up' | 'down', percent = 0.85) {
  const rect = await driver.getWindowRect()
  const left = Math.floor(rect.width * 0.10)
  const top = Math.floor(rect.height * 0.25)
  const width = Math.floor(rect.width * 0.80)
  const height = Math.floor(rect.height * 0.55)

  // @ts-ignore
  await driver.execute('mobile: scrollGesture', {
    left, top, width, height,
    direction,
    percent,
  })
  
  await pauseShort(700)
}
