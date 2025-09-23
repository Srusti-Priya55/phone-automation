// test/specs/install-adb.e2e.ts
import * as path from 'node:path'
import * as fs from 'node:fs'
import { driver, $, $$ } from '@wdio/globals'
import { step, feature, story, severity } from '../utils/report'
import { labelSection } from '../utils/flow'

const PKG = 'com.cisco.anyconnect.vpn.android.avf'
const APK = path.resolve(__dirname, '../../apps/anyconnect-android-5.1.7.84-release.apk')
const FLOW = process.env.CURRENT_FLOW || 'Adhoc';

/** Reusable flow (can be imported by a sanity suite) */
export async function runInstallAdb() {
  feature('Installation')
  story('Install via ADB')
  severity('normal')

  await step('Verify APK file exists', async () => {
    if (!fs.existsSync(APK)) {
      throw new Error(` APK file not found at expected path: ${APK}.
Please make sure the APK is placed in the "apps" folder before running tests.`)
    }
  })

  const installed = await step('Check if app is already installed on device', async () => {
    return driver.isAppInstalled(PKG)
  })

  if (!installed) {
    await step('Install APK onto device', async () => {
      try {
        await driver.installApp(APK)
      } catch (err) {
        throw new Error(` Failed to install APK from path: ${APK}.
Reason: ${(err as Error).message}`)
      }
    })
  }

  await step('Launch Cisco Secure Client app', async () => {
    try {
      await driver.activateApp(PKG)
      await driver.waitUntil(
        async () => (await driver.getCurrentPackage()) === PKG,
        { timeout: 20000, interval: 500, timeoutMsg: ' Cisco Secure Client did not come to foreground within 20s.' }
      )
    } catch (err) {
      throw new Error(` Failed to launch Cisco Secure Client.
Reason: ${(err as Error).message}`)
    }
  })

  await step('Handle first-run popups (OK / Allow)', async () => {
    const handled = await handleFirstRunPopups()
    if (!handled) {
      throw new Error(' Expected first-run popups (OK/Allow) were not found or not handled.')
    }
  })
}

/* ---------- Helpers ---------- */
async function tapIfText(regex: RegExp, timeout = 3000): Promise<boolean> {
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

async function handleFirstRunPopups(maxPasses = 5): Promise<boolean> {
  const okButtons = [/^(OK|Ok|Okay)$/i, /^Allow$/i]
  let clickedAny = false

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

    if (clicked) {
      clickedAny = true
      await driver.pause(600)
    } else {
      break
    }
  }
  return clickedAny
}

/** Runnable test wrapper (so this file executes by itself) */

describe(`${FLOW} - Install via ADB`, () => {
  before(() => labelSection('Install via ADB'))
    it('installs APK if missing, launches app, and handles popups', async () => {
      await runInstallAdb()
    })
  })







// // test/specs/install-adb.e2e.ts
// import * as path from 'node:path';
// import * as fs from 'node:fs';
// import { driver, $, $$ } from '@wdio/globals';

// const PKG = 'com.cisco.anyconnect.vpn.android.avf';
// const APK = path.resolve(__dirname, '../../apps/anyconnect-android-5.1.7.84-release.apk');

// describe('Install AnyConnect via ADB', () => {
//   it('installs if missing, then launches and verifies + handles first-run popups', async () => {
//     if (!fs.existsSync(APK)) {
//       throw new Error(`APK not found at: ${APK}`);
//     }

//     // Install if not present
//     const installed = await driver.isAppInstalled(PKG);
//     if (!installed) {
//       await driver.installApp(APK);
//     }

//     // Bring app to foreground
//     await driver.activateApp(PKG);

//     // Wait until it’s in foreground
//     await driver.waitUntil(
//       async () => (await driver.getCurrentPackage()) === PKG,
//       { timeout: 20000, interval: 500, timeoutMsg: 'Cisco Secure Client did not come to foreground' }
//     );

//     // Handle first-run consent / permission dialogs
//     await handleFirstRunPopups();

//     // Optional: brief settle pause
//     await driver.pause(1500);
//   });
// });

// /* ---------------- helpers (same behavior style as your Play Store spec) ---------------- */

// async function tapIfText(regex: RegExp, timeout = 3000) {
//   try {
//     const el = await $(`android=new UiSelector().textMatches("${regex.source}")`);
//     await el.waitForExist({ timeout });
//     if (await el.isDisplayed()) {
//       await el.click();
//       await driver.pause(300);
//       return true;
//     }
//   } catch {}
//   return false;
// }

// async function tapAnyVisible(regexes: RegExp[], timeoutEach = 1200): Promise<boolean> {
//   for (const rx of regexes) {
//     if (await tapIfText(rx, timeoutEach)) return true;
//   }
//   return false;
// }

// async function handleFirstRunPopups(maxPasses = 5) {
//   // Permit controller package sometimes differs; we rely on text so it’s robust.
//   const okButtons = [/^(OK|Ok|Okay|Allow|allow)$/i];


//   for (let pass = 0; pass < maxPasses; pass++) {
//     let clicked = false;

//     // Try the most common sequences on Cisco Secure Client first-run
//     clicked = (await tapAnyVisible(okButtons, 1200)) || clicked;


//     // Some dialogs show a positive button by resource-id (optional; best-effort)
//     // Try a quick generic “positive button” sweep by class if present
//     try {
//       const buttons = (await $$('android=new UiSelector().className("android.widget.Button")')) as unknown as WebdriverIO.Element[];
//       for (const b of buttons) {
//         const txt = (await b.getText()).trim();
//         if (/^(OK|Ok|Allow)$/i.test(txt)) {
//           await b.click();
//           await driver.pause(300);
//           clicked = true;
//           break;
//         }
//       }
//     } catch {}

//     if (!clicked) {
//       // nothing else to clear on this pass; stop early
//       break;
//     }

//     // Give the next dialog time to appear
//     await driver.pause(600);
//   }
// }





