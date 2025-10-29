// // // test/specs/add-asa-and-connect.e2e.ts
// import { driver } from '@wdio/globals'
// import allure from '@wdio/allure-reporter'
// import { Status } from 'allure-js-commons'
// import { exec as _exec } from 'node:child_process'
// import { promisify } from 'node:util'
// import { step } from '../utils/report'

// import { feature, story, severity } from '../utils/report'
// const exec = promisify(_exec)
// const FLOW = process.env.CURRENT_FLOW || 'Adhoc';

// /** ---------- Constants ---------- */
// const APP_PKG = 'com.cisco.anyconnect.vpn.android.avf'
// const ASA_HOST = process.env.ASA_HOST?.trim() || 'asa8.synocorp.net'
// const GROUP_LABEL = process.env.CSC_GROUP?.trim() || 'SWGFull'
// const VPN_USER = process.env.VPN_USER ?? 'skatem'
// const VPN_PASS = process.env.VPN_PASS ?? 'SYNOcorp$3972'
// const TITLE_ID = `${APP_PKG}:id/alertTitle`
// const GROUP_INPUT_CLASS = 'android.widget.AutoCompleteTextView'
// const WAIT_AFTER_TOGGLE = 6000

// /* ---------------- allure helpers ---------------- */
// async function takeAndAttachScreenshot(name: string) {
//   const b64 = await driver.takeScreenshot()
//   allure.addAttachment(name, Buffer.from(b64, 'base64'), 'image/png')
// }

// /* ---------------- adb log helper ---------------- */
// async function captureNvmLogs() {
//   const cmd =
//     process.platform === 'win32'
//       ? `cmd /c adb logcat -d | findstr nvmagent`
//       : `adb logcat -d | grep nvmagent`
//   const { stdout } = await exec(cmd, { maxBuffer: 20 * 1024 * 1024 })
//   allure.addAttachment('NVM Agent Logs', stdout, 'text/plain')
// }

// describe(`${FLOW} - Cisco Secure Client - add ASA, then connect via username and password`, () => {

//   it('adds ASA, toggles VPN, connects, captures NVM logs', async () => {
//     await step('Bring Cisco Secure Client to foreground', async () => {
//       await foregroundCisco()
//     })

//     await step('Open Connections screen', async () => {
//       const connections = await $('android=new UiSelector().textContains("Connections")')
//       if (!(await connections.isExisting())) throw new Error('Could not find "Connections" entry')
//       await connections.click()
//     })

//     await step('Tap (+) to add a new ASA connection', async () => {
//       await tapPlusFab()
//     })

//     await step(`Enter server and save (${ASA_HOST})`, async () => {
//       await typeServerAndSave(ASA_HOST)
//     })

//     await step('Select the newly added ASA to return home', async () => {
//       await $(`android=new UiSelector().textContains("${ASA_HOST}")`).waitForExist({ timeout: 8000 })
//       await (await $(`android=new UiSelector().textContains("${ASA_HOST}")`)).click()
//       await waitForCiscoHome()
//       await $('android=new UiSelector().className("android.widget.Switch")').waitForExist({ timeout: 8000 })
//     })

//     await step('Toggle VPN to open the Connect dialog', async () => {
//       await openPopupViaToggle()
//     })

//     await step(`Choose Group: ${GROUP_LABEL}`, async () => {
//       await openGroupAndType(GROUP_LABEL)
//     })

//     await step('Enter credentials and Connect', async () => {
//       await fillCredsAndConnect(VPN_USER, VPN_PASS)
//     })

//     await step('Handle popup and wait for VPN to settle', async () => {
//       await driver.pause(8000)
//       await clickIfPresent(/^(OK|Ok|Okay)$/i, 8000)
//     })

//     await step('Capture NVM Agent logs', async () => {
//       await captureNvmLogs()
//     })
//   })
// })

// async function foregroundCisco() {
//   const pkg = await driver.getCurrentPackage().catch(() => '')
//   if (pkg !== APP_PKG) await driver.activateApp(APP_PKG)
//   await driver.pause(300)
// }

// async function tapPlusFab() {
//   // 1) Content-desc variants
//   const byDesc = $$(
//     'android=new UiSelector().descriptionMatches("(?i)(add|add connection|new|create)")'
//   ) as unknown as WebdriverIO.ElementArray
//   if (await byDesc.length) {
//     await (await byDesc[0]).click()
//     return
//   }
//   const fabs = $$('android=new UiSelector().className("android.widget.ImageButton")') as unknown as WebdriverIO.ElementArray
//   if (await fabs.length) {
//     try {
//       await (await fabs[(await fabs.length) - 1]).click()
//       return
//     } catch { /* fall through */ }
//   }
//   await tapBottomRight()
// }

// async function typeServerAndSave(host: string) {
//   const serverLabel = await $('android=new UiSelector().textContains("Server Address")')
//   if (await serverLabel.isExisting()) {
//     await serverLabel.click()
//     try {
//       await serverLabel.setValue(host)
//     } catch {
//       const firstEdit = await $('android=new UiSelector().className("android.widget.EditText")')
//       await firstEdit.click()
//       await firstEdit.setValue(host)
//     }
//   } else {
//     const firstEdit = await $('android=new UiSelector().className("android.widget.EditText")')
//     await firstEdit.click()
//     await firstEdit.setValue(host)
//   }

//   await dismissKeyboard()
//   const done = await $('android=new UiSelector().textMatches("(?i)^Done$")')
//   if (await done.isExisting()) {
//     await done.click()
//   } else {
//     const doneDesc = await $('android=new UiSelector().descriptionMatches("(?i)^Done$")')
//     if (await doneDesc.isExisting()) await doneDesc.click()
//     else await driver.back() 
//   }
// }

// async function dismissKeyboard() {
//   try {
//     await driver.hideKeyboard()
//     await driver.pause(300)
//     return
//   } catch { /* ignore */ }
//   try {
//     await driver.back()
//     await driver.pause(300)
//   } catch { /* ignore */ }
// }

// async function waitForCiscoHome() {
//   for (let i = 0; i < 4; i++) {
//     const title = await $('android=new UiSelector().textContains("Cisco Secure Client")')
//     if (await title.isExisting()) return
//     await driver.back()
//     await driver.pause(300)
//   }
// }

// async function tapBottomRight() {
//   const { width, height } = await driver.getWindowRect()
//   const x = Math.floor(width * 0.92)
//   const y = Math.floor(height * 0.88)
//   await driver.touchAction({ action: 'tap', x, y })
//   await driver.pause(300)
// }

// /** ---- Connect flow helpers ---- */

// async function openPopupViaToggle() {
//   await foregroundCisco()

//   const sw = await $('android=new UiSelector().className("android.widget.Switch")')
//   await sw.waitForDisplayed({ timeout: 25000 })
//   await sw.click()

//   await driver.pause(WAIT_AFTER_TOGGLE)

//   const title = await $(`id=${TITLE_ID}`)
//   if (!(await title.isDisplayed())) {
//     // retry once if system stole focus
//     await foregroundCisco()
//     await sw.click()
//     await driver.pause(WAIT_AFTER_TOGGLE)
//     await title.waitForDisplayed({ timeout: 8000 })
//   }
// }

// /**
//  * UPDATED ONLY HERE (per your request):
//  * - after typing prefix, we re-open the dropdown and do 1× DPAD_DOWN + ENTER
//  * - retry once if the value didn’t commit
//  * - then keep your original fallbacks unchanged
//  */
// async function openGroupAndType(prefix: string) {
//   // Focus the group input, type prefix
//   const input = await $(`android=new UiSelector().className("${GROUP_INPUT_CLASS}")`);
//   await input.waitForDisplayed({ timeout: 10000 });
//   await input.click();
//   await driver.pause(200);

//   try { await input.clearValue(); } catch {}
//   await input.setValue(prefix);
//   await driver.pause(500);

//   // Hide IME so the suggestion list isn’t covered
//   try { await driver.hideKeyboard(); } catch { await driver.back(); }
//   await driver.pause(300);

//   // === NEW: re-open dropdown, go one row DOWN, then ENTER ===
//   await input.click();                 // open suggestion list
//   await driver.pause(120);
//   await pressKey(20);                  // DPAD_DOWN
//   await driver.pause(120);
//   await pressKey(66);                  // ENTER
//   await driver.pause(250);

//   // verify once; if it still shows just the typed text, try one more DOWN+ENTER
//   const after1 =
//     (await input.getText().catch(async () => (await input.getAttribute('text')) || ''))?.trim() || ''
//   if (after1.toLowerCase() === prefix.toLowerCase()) {
//     await input.click();
//     await driver.pause(120);
//     await pressKey(20);
//     await driver.pause(120);
//     await pressKey(66);
//     await driver.pause(250);
//   }

//   // If something is filled, proceed (some UIs commit exact same text)
//   const valNow =
//     (await input.getText().catch(async () => (await input.getAttribute('text')) || ''))?.trim() || ''
//   if (valNow.length) return;

//   // ---------- Your original fallbacks (unchanged) ----------
//   const rx = `(?i)^${prefix}$`;
//   const quick = await $(`android=new UiSelector().textMatches("${rx}")`);
//   if (await quick.isExisting() && await quick.isDisplayed()) {
//     await quick.click();
//     await driver.pause(200);
//     return;
//   }

//   try {
//     await $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${prefix}")`);
//     const hit = await $(`android=new UiSelector().text("${prefix}")`);
//     if (await hit.isExisting()) {
//       await hit.click();
//       await driver.pause(200);
//       return;
//     }
//   } catch { /* ignore and continue */ }

//   const ci = (s: string) =>
//     `contains(translate(@text,'abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ'),'${s.toUpperCase()}')`;

//   const chooser = await $(
//     `//android.widget.TextView[@text="${prefix}"] | //android.widget.CheckedTextView[@text="${prefix}"] | ` +
//     `//android.widget.TextView[${ci(prefix)}] | //android.widget.CheckedTextView[${ci(prefix)}]`
//   );
//   if (await chooser.isExisting() && await chooser.isDisplayed()) {
//     await chooser.click();
//     await driver.pause(200);
//     return;
//   }

//   for (let i = 0; i < 5; i++) {
//     const { width, height } = await driver.getWindowRect();
//     await driver.execute('mobile: scrollGesture', {
//       left: Math.floor(width * 0.10),
//       top: Math.floor(height * 0.25),
//       width: Math.floor(width * 0.80),
//       height: Math.floor(height * 0.55),
//       direction: 'up',
//       percent: 0.85,
//     });
//     await driver.pause(250);

//     const again = await $(
//       `//android.widget.TextView[@text="${prefix}"] | //android.widget.CheckedTextView[@text="${prefix}"] | ` +
//       `//android.widget.TextView[${ci(prefix)}] | //android.widget.CheckedTextView[${ci(prefix)}]`
//     );
//     if (await again.isExisting() && await again.isDisplayed()) {
//       await again.click();
//       await driver.pause(200);
//       return;
//     }
//   }

//   throw new Error(`${prefix} option did not appear after typing; dropdown may not be visible`);
// }

// async function fillCredsAndConnect(user: string, pass: string) {
//   const userField = await $('//android.widget.EditText[@text="Username:"]')
//   const passField = await $('//android.widget.EditText[@text="Password:"]')

//   await userField.waitForDisplayed({ timeout: 8000 })
//   await userField.click()
//   await userField.setValue(user)

//   await passField.waitForDisplayed({ timeout: 8000 })
//   await passField.click()
//   await passField.setValue(pass)
//   await driver.back() // hide keyboard

//   const connect = await $('//android.widget.Button[@text="Connect"]')
//   await connect.waitForEnabled({ timeout: 15000 })
//   await connect.click()
// }

// async function clickIfPresent(regex: RegExp, timeout = 5000) {
//   try {
//     const el = await $(`android=new UiSelector().textMatches("${regex.source}")`)
//     await el.waitForExist({ timeout })
//     if (await el.isDisplayed()) {
//       await el.click()
//       await driver.pause(400)
//       return true
//     }
//   } catch { /* ignore */ }
//   return false
// }

// /* --------- APPENDED: exported runner (no other changes) --------- */
// export async function runAddAsaAndConnect() {
//   feature('VPN Connection')
//   story('Add ASA and Connect')
//   severity('normal')

//   await step('Bring Cisco Secure Client to foreground', async () => {
//     await foregroundCisco()
//   })

//   await step('Open Connections screen', async () => {
//     const connections = await $('android=new UiSelector().textContains("Connections")')
//     if (!(await connections.isExisting())) throw new Error('Could not find "Connections" entry')
//     await connections.click()
//   })

//   await step('Tap (+) to add a new ASA connection', async () => {
//     await tapPlusFab()
//   })

//   await step(`Enter server and save (${ASA_HOST})`, async () => {
//     await typeServerAndSave(ASA_HOST)
//   })

//   await step('Select the newly added ASA to return home', async () => {
//     await $(`android=new UiSelector().textContains("${ASA_HOST}")`).waitForExist({ timeout: 8000 })
//     await (await $(`android=new UiSelector().textContains("${ASA_HOST}")`)).click()
//     await waitForCiscoHome()
//     await $('android=new UiSelector().className("android.widget.Switch")').waitForExist({ timeout: 8000 })
//   })

//   await step('Toggle VPN to open the Connect dialog', async () => {
//     await openPopupViaToggle()
//   })

//   await step(`Choose Group: ${GROUP_LABEL}`, async () => {
//     await openGroupAndType(GROUP_LABEL)
//   })

//   await step('Enter credentials and Connect', async () => {
//     await fillCredsAndConnect(VPN_USER, VPN_PASS)
//   })

//   await step('Handle popup and wait for VPN to settle', async () => {
//     await driver.pause(8000)
//     await clickIfPresent(/^(OK|Ok|Okay)$/i, 8000)
//   })

//   await step('Capture NVM Agent logs', async () => {
//     await captureNvmLogs()
//   })
// }

// /* --- tiny helper for DPAD without TS errors --- */
// async function pressKey(keycode: number) {
//   try {
//     // @ts-ignore Appium Android extension
//     await (driver as any).pressKeyCode(keycode)
//   } catch {
//     try {
//       // W3C fallback
//       // @ts-ignore
//       await driver.execute('mobile: pressKey', { keycode })
//     } catch { /* ignore */ }
//   }
// }

// test/specs/vpn-connect.e2e.ts
import { driver, $, $$ } from '@wdio/globals'
import { step, feature, story, severity } from '../utils/report'
import { networkInterfaces } from 'os'

/** === Your values (same as you shared) === */
const APP_PKG   = 'com.cisco.anyconnect.vpn.android.avf'
const ASA_HOST  = process.env.ASA_HOST  || 'asa8.synocorp.net'
const GROUP_TXT = process.env.CSC_GROUP || 'SWGFull'      // SWGF (caps) + ull (lower) is fine – we compare case-insensitively
const VPN_USER  = process.env.VPN_USER  || 'skatem'
const VPN_PASS  = process.env.VPN_PASS  || 'SYNOcorp$3972'
const FLOW      = process.env.CURRENT_FLOW || 'Adhoc'

/** small helpers */
const pause = (ms: number) => driver.pause(ms)
const equalsCi = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

async function pressKeyCode(code: number) {
  // Android UiAutomator2 supports this; typings may not expose it
  // @ts-ignore
  if (typeof driver.pressKeyCode === 'function') return driver.pressKeyCode(code)
  // Fallback W3C mobile extension
  // @ts-ignore
  return driver.execute('mobile: pressKey', { keycode: code })
}

async function hideIme() {
  try { await driver.hideKeyboard() } catch { try { await driver.back() } catch {} }
  await pause(200)
}

/** Bring app to front */
async function foregroundCisco() {
  let pkg = ''
  try { pkg = await driver.getCurrentPackage() } catch {}
  if (pkg !== APP_PKG) await driver.activateApp(APP_PKG)
  await pause(300)
}

/** After Done/Save, be sure we are back on Cisco home with the AnyConnect switch visible */
async function backToHome() {
  for (let i = 0; i < 5; i++) {
    const title = await $('android=new UiSelector().textContains("Cisco Secure Client")')
    const sw    = await $('android=new UiSelector().className("android.widget.Switch")')
    if ((await title.isExisting()) && (await sw.isExisting())) return
    try { await driver.back() } catch {}
    await pause(250)
  }
}

/** Tap (+) robustly but without changing your flow */
async function tapPlus() {
  // 1) Most common: content-desc has "add"
  const byDesc = await $$('android=new UiSelector().descriptionMatches("(?i)(add|add connection|new|create)")')
  if (await byDesc.length) { await byDesc[0].click(); return }

  // 2) FAB by id guess
  const fabs = await $$('android=new UiSelector().resourceIdMatches("(?i).*fab.*")')
  if (await fabs.length) { await fabs[0].click(); return }

  // 3) Last ImageButton on screen tends to be the + FAB
  const imgs = await $$('android=new UiSelector().className("android.widget.ImageButton")')
  if (imgs.length) { await imgs[await imgs.length - 1].click(); return }

  // 4) Bottom-right tap fallback
  const { width, height } = await driver.getWindowRect()
  await driver.touchAction({ action: 'tap', x: Math.floor(width * 0.92), y: Math.floor(height * 0.88) })
}

/** Add ASA server and save */
async function addServer(host: string) {
  // Prefer the EditText closest to "Server Address" label; if not, use last EditText
  const lower = 'translate(@text,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")'
  const labeled = await $(`//android.widget.TextView[contains(${lower},"server address")]/following-sibling::android.widget.EditText[1]`)
  if (await labeled.isExisting()) {
    await labeled.click(); await labeled.setValue(host)
  } else {
    const edits = await $$('android=new UiSelector().className("android.widget.EditText")')
    const tgt   = edits.length ? edits[await edits.length - 1] : undefined
    if (!tgt) throw new Error('No input field found for Server Address')
    await tgt.click(); await tgt.setValue(host)
  }

  await hideIme()

  // Tap Done/Save/OK/Add explicitly; else back once
  const done = await $('android=new UiSelector().textMatches("(?i)^(done|save|ok|add)$")')
  if (await done.isExisting()) await done.click()
  else { try { await driver.back() } catch {} }

  await pause(400)
}

/** Open the Connect dialog via AnyConnect VPN switch – NO settings, NO continue */
async function openConnectDialog() {
  const sw = await $('android=new UiSelector().className("android.widget.Switch")')
  await sw.waitForDisplayed({ timeout: 20000 })
  await sw.click()
  // allow dialog animation
  await pause(800)
}

/**
 * === EXACTLY WHAT YOU ASKED FOR ===
 * 1) Focus group field (AutoCompleteTextView)
 * 2) Clear → type prefix (SWGFull)
 * 3) Re-open dropdown (tap the field again)
 * 4) DPAD_DOWN once (select the first matched suggestion) → ENTER to commit
 * 5) Verify text equals the target; if not, retry once with slower timing
 */
async function chooseGroupByDpadOnce(target: string) {
  const input = await $('android=new UiSelector().className("android.widget.AutoCompleteTextView")')
  await input.waitForDisplayed({ timeout: 15000 })
  await input.click(); await pause(120)
  try { await input.clearValue() } catch {}
  await input.setValue(target); await pause(300)
  await hideIme()

  // Re-open the dropdown by tapping the field again (keeps your “search then move down one row” idea)
  await input.click(); await pause(150)

  // Down once → Enter
  await pressKeyCode(20)  // DPAD_DOWN
  await pause(120)
  await pressKeyCode(66)  // ENTER
  await pause(200)

  // Verify the field now shows the committed selection
  let val = ''
  try { val = await input.getText() } catch {}
  if (equalsCi(val, target)) return

  // Retry once a bit slower
  await input.click(); await pause(180)
  await pressKeyCode(20); await pause(220)
  await pressKeyCode(66); await pause(220)

  try { val = await input.getText() } catch {}
  if (!equalsCi(val, target)) {
    throw new Error(`Group selection did not commit. Field shows "${val || '(empty)'}" instead of "${target}".`)
  }
}

/** Fill credentials and tap Connect */
async function fillCredsAndConnect(user: string, pass: string) {
  const edits = await $$('//android.widget.EditText')
  if (await edits.length >= 2) {
    await edits[0].click(); await edits[0].setValue(user)
    await edits[1].click(); await edits[1].setValue(pass)
  } else {
    const u = await $('//android.widget.EditText[@text="Username:"]')
    const p = await $('//android.widget.EditText[@text="Password:"]')
    await u.click(); await u.setValue(user)
    await p.click(); await p.setValue(pass)
  }
  await hideIme()

  const connect = await $('//android.widget.Button[@text="Connect"]')
  await connect.waitForEnabled({ timeout: 15000 })
  await connect.click()
}

describe(`${FLOW} - VPN CONNECT (no Settings, no Continue; DPAD select)`, () => {
  it('Open app → Connections → + → ASA → back home → VPN toggle → pick SWGFull (DPAD) → creds → Connect', async () => {
    feature('VPN Connection')
    story('Dropdown commit with DPAD_DOWN + ENTER')
    severity('normal')

    await step('Bring Cisco Secure Client to foreground', foregroundCisco)

    await step('Open "Connections"', async () => {
      const connections = await $('android=new UiSelector().textContains("Connections")')
      await connections.waitForDisplayed({ timeout: 20000 })
      await connections.click()
      await pause(300)
    })

    await step('Tap (+) to add a new ASA', tapPlus)
    await step(`Enter server "${ASA_HOST}" and save`, async () => { await addServer(ASA_HOST) })
    await step('Return to Cisco home (ensure AnyConnect toggle visible)', backToHome)

    await step('Open Connect dialog via AnyConnect switch', openConnectDialog)

    await step(`Choose group: ${GROUP_TXT} (clear → type → open → DPAD_DOWN → ENTER)`, async () => {
      await chooseGroupByDpadOnce(GROUP_TXT)
    })

    await step('Enter credentials and Connect', async () => {
      await fillCredsAndConnect(VPN_USER, VPN_PASS)
      // optional: wait and tap OK if it appears later
      await pause(1200)
      const ok = await $('android=new UiSelector().textMatches("(?i)^(ok|okay)$")')
      if (await ok.isExisting()) await ok.click()
    })
  })
})




