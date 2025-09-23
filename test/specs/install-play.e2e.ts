// test/specs/install-play.e2e.ts
import { driver } from '@wdio/globals'
import { expect } from 'chai'
import { step, feature, story, severity } from '../utils/report'
import { labelSection } from '../utils/flow'

const PLAY_PKG = 'com.android.vending'
const APP_PKG  = 'com.cisco.anyconnect.vpn.android.avf'
const APP_NAME = 'Cisco Secure Client'
const FLOW = process.env.CURRENT_FLOW || 'Adhoc';
/** Reusable flow */
export async function runInstallPlay() {
  feature('Installation')
  story('Install via Play Store')
  severity('normal')

  await step('Open Play Store - app details', async () => {
    await driver.execute('mobile: deepLink', {
      url: `market://details?id=${APP_PKG}`,
      package: PLAY_PKG,
    })
    await driver.pause(1000)
  })

  await step('Search for Cisco Secure Client if not on details', async () => {
    const detailsBtn = await getIfDisplayed(
      'android=new UiSelector().textMatches("(?i)^(Open|Install|Update)$")'
    )
    const onDetails = !!detailsBtn

    if (!onDetails) {
      await driver.execute('mobile: deepLink', {
        url: `market://search?q=${encodeURIComponent(APP_NAME)}`,
        package: PLAY_PKG,
      })
      await driver.pause(1200)

      const hit = await getIfDisplayed(
        `android=new UiSelector().textContains("${APP_NAME}")`
      )
      if (hit) {
        await hit.click()
        await driver.pause(1000)
      }
    }
  })

  await step('Install/Update if available', async () => {
    const button = await getIfDisplayed(
      'android=new UiSelector().textMatches("(?i)^(Install|Update)$")'
    )
    if (button) {
      await button.click()
    }
  })

  await step('Wait for "Open", then tap', async () => {
    await driver.pause(15000)
    const start = Date.now()
    const timeoutMs = 180_000
    const interval = 2500

    while (Date.now() - start < timeoutMs) {
      const openBtn = await getIfDisplayed('android=new UiSelector().textMatches("(?i)^Open$")')
      if (openBtn) {
        await openBtn.click()
        return
      }
      await driver.pause(interval)
    }
    throw new Error('Timed out waiting for "Open" button on Play Store')
  })

  await step('Handle first-run popups: OK → Allow', async () => {
    await handleFirstRunPopups()
  })

  await step('Verify Cisco Secure Client is foreground', async () => {
    expect(await driver.getCurrentPackage()).to.equal(APP_PKG)
    await driver.pause(800)
  })
}

/* ---------- helpers ---------- */
async function getIfDisplayed(selector: string) {
  try {
    const el = await $(selector)
    if (await el.isDisplayed()) return el
  } catch {}
  return null
}

async function tapIfText(regex: RegExp, timeout = 3000) {
  try {
    const el = await $(`android=new UiSelector().textMatches("${regex.source}")`)
    await el.waitForExist({ timeout })
    if (await el.isDisplayed()) {
      await el.click()
      await driver.pause(300)
      return true
    }
  } catch {}
  return false
}

async function tapAnyVisible(regexes: RegExp[], timeoutEach = 1200): Promise<boolean> {
  for (const rx of regexes) {
    if (await tapIfText(rx, timeoutEach)) return true
  }
  return false
}

async function handleFirstRunPopups(maxPasses = 5) {
  const okButtons = [/^(OK|Ok|Okay)$/i, /^(Allow)$/i]
  for (let pass = 0; pass < maxPasses; pass++) {
    let clicked = await tapAnyVisible(okButtons, 1500)
    if (!clicked) {
      try {
        const buttons = await $$('android=new UiSelector().className("android.widget.Button")')
        for (const b of buttons) {
          const txt = (await b.getText()).trim()
          if (/^(OK|Ok|Allow)$/i.test(txt)) {
            await b.click()
            await driver.pause(300)
            clicked = true
            break
          }
        }
      } catch {}
    }
    if (!clicked) break
    await driver.pause(600)
  }
}


  describe(`${FLOW} - Install via Play Store`, () => {
    before(() => labelSection('Install via Play Store'))
    it('searches, installs, opens app, accepts OK/Allow', async () => {
      await runInstallPlay()
    })
  })





// import { driver } from '@wdio/globals';
// import { expect } from 'chai';

// const PLAY_PKG = 'com.android.vending';
// const APP_PKG  = 'com.cisco.anyconnect.vpn.android.avf';

// describe('Install AnyConnect via Play Store', () => {
//   it('installs Cisco Secure Client and opens it', async () => {
//     // Open Play Store page for Cisco Secure Client
//     await driver.execute('mobile: deepLink', {
//       url: `market://details?id=${APP_PKG}`,
//       package: PLAY_PKG,
//     });

//     // Tap Install/Update if available
//     await tapIfText(/^(Install|Update)$/i, 4000);

//     // Wait until "Open" appears, then tap
//     await waitForOpenQuiet({
//       initialBufferMs: 15000,
//       timeoutMs: 180000,
//       intervalMs: 2500,
//     });
//     await tapIfText(/^Open$/i, 5000);

//     // Handle first-run popups in sequence: OK → Allow
//     await clickIfPresent(/^(OK|Ok|Okay)$/i, 8000);
//     await clickIfPresent(/^(Allow)$/i, 8000);

//     // Verify app package in foreground
//     expect(await driver.getCurrentPackage()).to.equal(APP_PKG);
//     await driver.pause(2000);
//   });
// });

// /* ---------------- helpers ---------------- */

// async function tapIfText(regex: RegExp, timeout = 3000) {
//   try {
//     const el = await $(`android=new UiSelector().textMatches("${regex.source}")`);
//     await el.waitForExist({ timeout });
//     if (await el.isDisplayed()) {
//       await el.click();
//       return true;
//     }
//   } catch {}
//   return false;
// }

// async function waitForOpenQuiet(opts: { initialBufferMs: number; timeoutMs: number; intervalMs: number }) {
//   const { initialBufferMs, timeoutMs, intervalMs } = opts;
//   if (initialBufferMs > 0) await driver.pause(initialBufferMs);

//   const start = Date.now();
//   while (Date.now() - start < timeoutMs) {
//     const els = (await $$(
//       'android=new UiSelector().textMatches("(?i)^Open$")'
//     )) as unknown as WebdriverIO.Element[];

//     if (els.length > 0) {
//       await els[0].click(); // tap Open directly
//       return true;
//     }

//     await driver.pause(intervalMs);
//   }
//   throw new Error('Timed out waiting for "Open" on Play Store');
// }


// async function clickIfPresent(regex: RegExp, timeout = 5000) {
//   try {
//     const el = await $(`android=new UiSelector().textMatches("${regex.source}")`);
//     await el.waitForExist({ timeout });
//     if (await el.isDisplayed()) {
//       await el.click();
//       await driver.pause(500);
//       return true;
//     }
//   } catch {}
//   return false;
// }





