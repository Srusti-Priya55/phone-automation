// test/specs/add-asa-and-connect.e2e.ts
import { driver } from '@wdio/globals'
import allure from '@wdio/allure-reporter'
import { Status } from 'allure-js-commons'
import { exec as _exec } from 'node:child_process'
import { promisify } from 'node:util'
import { step } from '../utils/report'



import { feature, story, severity } from '../utils/report'
const exec = promisify(_exec)
const FLOW = process.env.CURRENT_FLOW || 'Adhoc';

/** ---------- Constants ---------- */
const APP_PKG = 'com.cisco.anyconnect.vpn.android.avf'
const ASA_HOST = process.env.ASA_HOST?.trim() || 'asa8.synocorp.net'
const GROUP_LABEL = process.env.CSC_GROUP?.trim() || 'SWGFull'
const VPN_USER = process.env.VPN_USER ?? 'skatem'
const VPN_PASS = process.env.VPN_PASS ?? 'SYNOcorp$3972'
const TITLE_ID = `${APP_PKG}:id/alertTitle`
const GROUP_INPUT_CLASS = 'android.widget.AutoCompleteTextView'
const WAIT_AFTER_TOGGLE = 6000

/* ---------------- allure helpers ---------------- */
async function takeAndAttachScreenshot(name: string) {
  const b64 = await driver.takeScreenshot()
  allure.addAttachment(name, Buffer.from(b64, 'base64'), 'image/png')
}


/* ---------------- adb log helper ---------------- */
async function captureNvmLogs() {
  const cmd =
    process.platform === 'win32'
      ? `cmd /c adb logcat -d | findstr nvmagent`
      : `adb logcat -d | grep nvmagent`
  const { stdout } = await exec(cmd, { maxBuffer: 20 * 1024 * 1024 })
  allure.addAttachment('NVM Agent Logs', stdout, 'text/plain')
}
    describe(`${FLOW} - Cisco Secure Client - add ASA, then connect via username and password`, () => {


    })
    it('adds ASA, toggles VPN, connects, captures NVM logs', async () => {
        await step('Bring Cisco Secure Client to foreground', async () => {
        await foregroundCisco()
        })

        await step('Open Connections screen', async () => {
        const connections = await $('android=new UiSelector().textContains("Connections")')
        if (!(await connections.isExisting())) throw new Error('Could not find "Connections" entry')
        await connections.click()
        })

        await step('Tap (+) to add a new ASA connection', async () => {
        await tapPlusFab()
        })

        await step(`Enter server and save (${ASA_HOST})`, async () => {
        await typeServerAndSave(ASA_HOST)
        })

        await step('Select the newly added ASA to return home', async () => {
        await $(`android=new UiSelector().textContains("${ASA_HOST}")`).waitForExist({ timeout: 8000 })
        await (await $(`android=new UiSelector().textContains("${ASA_HOST}")`)).click()
        await waitForCiscoHome()
        await $('android=new UiSelector().className("android.widget.Switch")').waitForExist({ timeout: 8000 })
        })

        await step('Toggle VPN to open the Connect dialog', async () => {
        await openPopupViaToggle()
        })

        await step(`Choose Group: ${GROUP_LABEL}`, async () => {
        await openGroupAndType(GROUP_LABEL)
        })

        await step('Enter credentials and Connect', async () => {
        await fillCredsAndConnect(VPN_USER, VPN_PASS)
        })

        await step('Handle popup and wait for VPN to settle', async () => {
        await driver.pause(8000)
        await clickIfPresent(/^(OK|Ok|Okay)$/i, 8000)

        })

        await step('Capture NVM Agent logs', async () => {
        await captureNvmLogs()
        })
    })




async function foregroundCisco() {
  const pkg = await driver.getCurrentPackage().catch(() => '')
  if (pkg !== APP_PKG) await driver.activateApp(APP_PKG)
  await driver.pause(300)
}

async function tapPlusFab() {
  // 1) Content-desc variants
  const byDesc = $$(
    'android=new UiSelector().descriptionMatches("(?i)(add|add connection|new|create)")'
  ) as unknown as WebdriverIO.ElementArray
  if (await byDesc.length) {
    await (await byDesc[0]).click()
    return
  }
  const fabs = $$('android=new UiSelector().className("android.widget.ImageButton")') as unknown as WebdriverIO.ElementArray
  if (await fabs.length) {
    try {
      await (await fabs[(await fabs.length) - 1]).click()
      return
    } catch { /* fall through */ }
  }
  await tapBottomRight()
}

async function typeServerAndSave(host: string) {
  const serverLabel = await $('android=new UiSelector().textContains("Server Address")')
  if (await serverLabel.isExisting()) {
    await serverLabel.click()
    try {
      await serverLabel.setValue(host)
    } catch {
      const firstEdit = await $('android=new UiSelector().className("android.widget.EditText")')
      await firstEdit.click()
      await firstEdit.setValue(host)
    }
  } else {
    const firstEdit = await $('android=new UiSelector().className("android.widget.EditText")')
    await firstEdit.click()
    await firstEdit.setValue(host)
  }

  await dismissKeyboard()
  const done = await $('android=new UiSelector().textMatches("(?i)^Done$")')
  if (await done.isExisting()) {
    await done.click()
  } else {
    const doneDesc = await $('android=new UiSelector().descriptionMatches("(?i)^Done$")')
    if (await doneDesc.isExisting()) await doneDesc.click()
    else await driver.back() 
  }
}

async function dismissKeyboard() {
  try {
    await driver.hideKeyboard()
    await driver.pause(300)
    return
  } catch { /* ignore */ }
  try {
    await driver.back()
    await driver.pause(300)
  } catch { /* ignore */ }
}

async function waitForCiscoHome() {
  for (let i = 0; i < 4; i++) {
    const title = await $('android=new UiSelector().textContains("Cisco Secure Client")')
    if (await title.isExisting()) return
    await driver.back()
    await driver.pause(300)
  }
}

async function tapBottomRight() {
  const { width, height } = await driver.getWindowRect()
  const x = Math.floor(width * 0.92)
  const y = Math.floor(height * 0.88)
  await driver.touchAction({ action: 'tap', x, y })
  await driver.pause(300)
}

/** ---- Connect flow helpers ---- */

async function openPopupViaToggle() {
  await foregroundCisco()

  const sw = await $('android=new UiSelector().className("android.widget.Switch")')
  await sw.waitForDisplayed({ timeout: 25000 })
  await sw.click()

  await driver.pause(WAIT_AFTER_TOGGLE)

  const title = await $(`id=${TITLE_ID}`)
  if (!(await title.isDisplayed())) {
    // retry once if system stole focus
    await foregroundCisco()
    await sw.click()
    await driver.pause(WAIT_AFTER_TOGGLE)
    await title.waitForDisplayed({ timeout: 8000 })
  }
}

async function openGroupAndType(prefix: string) {
  // Focus the group input, type prefix
  const input = await $(`android=new UiSelector().className("${GROUP_INPUT_CLASS}")`);
  await input.waitForDisplayed({ timeout: 10000 });
  await input.click();
  await driver.pause(200);

  try { await input.clearValue(); } catch {}
  await input.setValue(prefix);
  await driver.pause(500);

  // Hide IME so the suggestion list isn’t covered
  try { await driver.hideKeyboard(); } catch { await driver.back(); }
  await driver.pause(300);

  // 1) Fast path: find by UiSelector (case-insensitive regex)
  const rx = `(?i)^${prefix}$`;
  const quick = await $(`android=new UiSelector().textMatches("${rx}")`);
  if (await quick.isExisting() && await quick.isDisplayed()) {
    await quick.click();
    await driver.pause(200);
    return;
  }

  // 2) Try UiScrollable (works when it’s a scrollable popup/list)
  try {
    await $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${prefix}")`);
    const hit = await $(`android=new UiSelector().text("${prefix}")`);
    if (await hit.isExisting()) {
      await hit.click();
      await driver.pause(200);
      return;
    }
  } catch { /* ignore and continue */ }

  // 3) Fallback: XPath sweep across TextView/CheckedTextView
  const ci = (s: string) =>
    `contains(translate(@text,'abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ'),'${s.toUpperCase()}')`;

  const chooser = await $(
    `//android.widget.TextView[@text="${prefix}"] | //android.widget.CheckedTextView[@text="${prefix}"] | ` +
    `//android.widget.TextView[${ci(prefix)}] | //android.widget.CheckedTextView[${ci(prefix)}]`
  );
  if (await chooser.isExisting() && await chooser.isDisplayed()) {
    await chooser.click();
    await driver.pause(200);
    return;
  }

  // 4) Last resort: gentle page scrolls and re-check
  for (let i = 0; i < 5; i++) {
    const { width, height } = await driver.getWindowRect();
    await driver.execute('mobile: scrollGesture', {
      left: Math.floor(width * 0.10),
      top: Math.floor(height * 0.25),
      width: Math.floor(width * 0.80),
      height: Math.floor(height * 0.55),
      direction: 'up',
      percent: 0.85,
    });
    await driver.pause(250);

    const again = await $(
      `//android.widget.TextView[@text="${prefix}"] | //android.widget.CheckedTextView[@text="${prefix}"] | ` +
      `//android.widget.TextView[${ci(prefix)}] | //android.widget.CheckedTextView[${ci(prefix)}]`
    );
    if (await again.isExisting() && await again.isDisplayed()) {
      await again.click();
      await driver.pause(200);
      return;
    }
  }

  throw new Error(`${prefix} option did not appear after typing; dropdown may not be visible`);
}

async function fillCredsAndConnect(user: string, pass: string) {
  const userField = await $('//android.widget.EditText[@text="Username:"]')
  const passField = await $('//android.widget.EditText[@text="Password:"]')

  await userField.waitForDisplayed({ timeout: 8000 })
  await userField.click()
  await userField.setValue(user)

  await passField.waitForDisplayed({ timeout: 8000 })
  await passField.click()
  await passField.setValue(pass)
  await driver.back() // hide keyboard

  const connect = await $('//android.widget.Button[@text="Connect"]')
  await connect.waitForEnabled({ timeout: 15000 })
  await connect.click()
}

async function clickIfPresent(regex: RegExp, timeout = 5000) {
  try {
    const el = await $(`android=new UiSelector().textMatches("${regex.source}")`)
    await el.waitForExist({ timeout })
    if (await el.isDisplayed()) {
      await el.click()
      await driver.pause(400)
      return true
    }
  } catch { /* ignore */ }
  return false
}

/* --------- APPENDED: exported runner (no other changes) --------- */
export async function runAddAsaAndConnect() {
  feature('VPN Connection')
  story('Add ASA and Connect')
  severity('normal')

  await step('Bring Cisco Secure Client to foreground', async () => {
    await foregroundCisco()
  })

  await step('Open Connections screen', async () => {
    const connections = await $('android=new UiSelector().textContains("Connections")')
    if (!(await connections.isExisting())) throw new Error('Could not find "Connections" entry')
    await connections.click()
  })

  await step('Tap (+) to add a new ASA connection', async () => {
    await tapPlusFab()
  })

  await step(`Enter server and save (${ASA_HOST})`, async () => {
    await typeServerAndSave(ASA_HOST)
  })

  await step('Select the newly added ASA to return home', async () => {
    await $(`android=new UiSelector().textContains("${ASA_HOST}")`).waitForExist({ timeout: 8000 })
    await (await $(`android=new UiSelector().textContains("${ASA_HOST}")`)).click()
    await waitForCiscoHome()
    await $('android=new UiSelector().className("android.widget.Switch")').waitForExist({ timeout: 8000 })
  })

  await step('Toggle VPN to open the Connect dialog', async () => {
    await openPopupViaToggle()
  })

  await step(`Choose Group: ${GROUP_LABEL}`, async () => {
    await openGroupAndType(GROUP_LABEL)
  })

  await step('Enter credentials and Connect', async () => {
    await fillCredsAndConnect(VPN_USER, VPN_PASS)
  })

  await step('Handle popup and wait for VPN to settle', async () => {
    await driver.pause(8000)
    await clickIfPresent(/^(OK|Ok|Okay)$/i, 8000)
  })

  await step('Capture NVM Agent logs', async () => {
    await captureNvmLogs()
  })
}
