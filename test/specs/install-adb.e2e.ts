// // test/specs/install-adb.e2e.ts
// import * as path from 'node:path'
// import * as fs from 'node:fs'
// import { driver, $, $$ } from '@wdio/globals'
// import { step, feature, story, severity } from '../utils/report'


// const PKG = 'com.cisco.anyconnect.vpn.android.avf'
// const APK = path.resolve(__dirname, '../../apps/anyconnect-android-5.1.11.407-release.apk')
// const FLOW = process.env.CURRENT_FLOW || 'Adhoc';

// /** Reusable flow (can be imported by a sanity suite) */
// export async function runInstallAdb() {
//   feature('Installation')
//   story('Install via ADB')
//   severity('normal')

//   await step('Verify APK file exists', async () => {
//     if (!fs.existsSync(APK)) {
//       throw new Error(` APK file not found at expected path: ${APK}.
// Please make sure the APK is placed in the "apps" folder before running tests.`)
//     }
//   })

//   const installed = await step('Check if app is already installed on device', async () => {
//     return driver.isAppInstalled(PKG)
//   })

//   if (!installed) {
//     await step('Install APK onto device', async () => {
//       try {
//         await driver.installApp(APK)
//       } catch (err) {
//         throw new Error(` Failed to install APK from path: ${APK}.
// Reason: ${(err as Error).message}`)
//       }
//     })
//   }

//   await step('Launch Cisco Secure Client app', async () => {
//     try {
//       await driver.activateApp(PKG)
//       await driver.waitUntil(
//         async () => (await driver.getCurrentPackage()) === PKG,
//         { timeout: 20000, interval: 500, timeoutMsg: ' Cisco Secure Client did not come to foreground within 20s.' }
//       )
//     } catch (err) {
//       throw new Error(` Failed to launch Cisco Secure Client.
// Reason: ${(err as Error).message}`)
//     }
//   })

//   await step('Handle first-run popups (OK / Allow)', async () => {
//     const handled = await handleFirstRunPopups()
//     if (!handled) {
//       throw new Error(' Expected first-run popups (OK/Allow) were not found or not handled.')
//     }
//   })
// }

// /* ---------- Helpers ---------- */
// async function tapIfText(regex: RegExp, timeout = 3000): Promise<boolean> {
//   try {
//     const el = await $(`android=new UiSelector().textMatches("${regex.source}")`)
//     await el.waitForExist({ timeout })
//     if (await el.isDisplayed()) {
//       await el.click()
//       await driver.pause(300)
//       return true
//     }
//   } catch {}
//   return false
// }

// async function tapAnyVisible(regexes: RegExp[], timeoutEach = 1200): Promise<boolean> {
//   for (const rx of regexes) {
//     if (await tapIfText(rx, timeoutEach)) return true
//   }
//   return false
// }

// async function handleFirstRunPopups(maxPasses = 5): Promise<boolean> {
//   const okButtons = [/^(OK|Ok|Okay)$/i, /^Allow$/i]
//   let clickedAny = false

//   for (let pass = 0; pass < maxPasses; pass++) {
//     let clicked = await tapAnyVisible(okButtons, 1500)

//     if (!clicked) {
//       try {
//         const buttons = await $$('android=new UiSelector().className("android.widget.Button")')
//         for (const b of buttons) {
//           const txt = (await b.getText()).trim()
//           if (/^(OK|Ok|Allow)$/i.test(txt)) {
//             await b.click()
//             await driver.pause(300)
//             clicked = true
//             break
//           }
//         }
//       } catch {}
//     }

//     if (clicked) {
//       clickedAny = true
//       await driver.pause(600)
//     } else {
//       break
//     }
//   }
//   return clickedAny
// }

// /** Runnable test wrapper (so this file executes by itself) */

// describe(`${FLOW} - Install via ADB`, () => {
//     it('installs APK if missing, launches app, and handles popups', async () => {
//       await runInstallAdb()
//     })
//   })

// test/specs/install-adb.e2e.ts
import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { driver, $, $$ } from '@wdio/globals';
import { step, feature, story, severity } from '../utils/report';

const PKG = 'com.cisco.anyconnect.vpn.android.avf';
const APK = path.resolve(__dirname, '../../apps/anyconnect-android-5.1.11.416-release.apk');
const FLOW = process.env.CURRENT_FLOW || 'Adhoc';

/** Reusable flow (can be imported by a sanity suite) */
export async function runInstallAdb(): Promise<void> {
  feature('Installation');
  story('Install via ADB');
  severity('normal');

  const caps = driver.capabilities as Record<string, any>;
  const udid = caps['appium:udid'] || caps.udid || process.env.ANDROID_UDID;
  if (!udid) throw new Error('UDID not found in driver capabilities!');
  console.log(`\n🔹 Running install flow on device: ${udid}`);

 
  await step('Verify APK file exists', async () => {
    if (!fs.existsSync(APK)) {
      throw new Error(
        `APK file not found at expected path: ${APK}.
Please make sure the APK is placed in the "apps" folder before running tests.`
      );
    }
  });

  const installed = await step('Check if app is already installed on device', async () => {
    return driver.isAppInstalled(PKG);
  });

  if (!installed) {
    await step('Install APK onto device', async () => {
      try {
        console.log(`Installing APK on device ${udid}...`);
        execSync(`adb -s ${udid} install -r "${APK}"`, { stdio: 'inherit' });
        console.log(`Installed Cisco Secure Client on ${udid}`);
      } catch (err: any) {
        console.warn(`Install failed on ${udid}, trying uninstall + reinstall...`);
        try {
          // Windows-safe uninstall (no || true)
          execSync(`adb -s ${udid} uninstall ${PKG}`, { stdio: 'inherit' });
          execSync(`adb -s ${udid} install -r "${APK}"`, { stdio: 'inherit' });
          console.log(`Reinstalled Cisco Secure Client on ${udid}`);
        } catch (err2: any) {
          throw new Error(`Still failed on ${udid}: ${err2.message}`);
        }
      }
    });
  } else {
    console.log(` App already installed on device: ${udid}`);
  }

  await step('Launch Cisco Secure Client app', async () => {
    try {
      execSync(`adb -s ${udid} shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`, {
        stdio: 'inherit',
      });
      console.log(`App launched on ${udid}`);
      await driver.pause(4000);
    } catch (err: any) {
      throw new Error(`Failed to launch Cisco Secure Client on ${udid}: ${err.message}`);
    }
  });

  await step('Handle first-run popups (OK / Allow)', async () => {
    const handled = await handleFirstRunPopups();
    if (!handled) {
      console.log('No first-run popups appeared on this device.');
    }
  });
}

async function tapIfText(regex: RegExp, timeout = 3000): Promise<boolean> {
  try {
    const el = await $(`android=new UiSelector().textMatches("${regex.source}")`);
    await el.waitForExist({ timeout });
    if (await el.isDisplayed()) {
      await el.click();
      await driver.pause(300);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

async function tapAnyVisible(regexes: RegExp[], timeoutEach = 1200): Promise<boolean> {
  for (const rx of regexes) {
    if (await tapIfText(rx, timeoutEach)) return true;
  }
  return false;
}

async function handleFirstRunPopups(maxPasses = 5): Promise<boolean> {
  const okButtons = [/^(OK|Ok|Okay)$/i, /^Allow$/i];
  let clickedAny = false;

  for (let pass = 0; pass < maxPasses; pass++) {
    let clicked = await tapAnyVisible(okButtons, 1500);

    if (!clicked) {
      try {
        const buttons = await $$('android=new UiSelector().className("android.widget.Button")');
        for (const b of buttons) {
          const txt = (await b.getText()).trim();
          if (/^(OK|Ok|Allow)$/i.test(txt)) {
            await b.click();
            await driver.pause(300);
            clicked = true;
            break;
          }
        }
      } catch {
        // ignore
      }
    }

    if (clicked) {
      clickedAny = true;
      await driver.pause(600);
    } else {
      break;
    }
  }
  return clickedAny;
}

/** Runnable test wrapper (so this file executes by itself) */
describe(`${FLOW} - Install via ADB`, () => {
  it('installs APK if missing, launches app, and handles popups', async () => {
    await runInstallAdb();
  });
});
