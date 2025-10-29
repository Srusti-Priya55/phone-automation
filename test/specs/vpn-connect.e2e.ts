
// // // test/specs/vpn-connect.e2e.ts
// // import { driver, $ } from '@wdio/globals'
// // import { step, feature, story, severity } from '../utils/report'

// // /**
// //  * Flow (as you asked):
// //  * 1) Open Cisco Secure Client
// //  * 2) Tap "Connections"
// //  * 3) Tap (+)
// //  * 4) Type ASA in **Server Address**
// //  * 5) Hide keyboard, then tap **Done**
// //  * 6) Back to home
// //  * 7) Open overflow (3-dots) → Settings
// //  * 8) Uncheck "Block Untrusted Servers"
// //  * 9) Back to home
// //  * 10) Tap "AnyConnect VPN" (toggle) to connect
// //  * 11) In security warning, tap **Continue**
// //  * 12) In Connect popup: open Group dropdown, pick **Split Inc (AAA)**
// //  * 13) Enter Username & Password, tap **Connect**
// //  */

// // const APP_PKG = 'com.cisco.anyconnect.vpn.android.avf'

// // // ---- change only these if needed ----
// // const ASA_HOST     = process.env.ASA_HOST     || 'asa8.synocorp.net'
// // const GROUP_LABEL  = process.env.CSC_GROUP    || 'Split Inc (AAA)'
// // const VPN_USER     = process.env.VPN_USER     || 'skatem'
// // const VPN_PASS     = process.env.VPN_PASS     || 'SYNOcorp$3972'
// // // -------------------------------------

// // describe('Cisco Secure Client - full flow with new group', () => {
// //   it('Add ASA → tweak settings → connect with Split Inc (AAA)', async () => {
// //     feature('VPN Connection')
// //     story('Add ASA & connect with updated group')
// //     severity('normal')

// //     await step('Bring Cisco Secure Client to foreground', async () => {
// //       const pkg = await driver.getCurrentPackage().catch(() => '')
// //       if (pkg !== APP_PKG) await driver.activateApp(APP_PKG)
// //       await driver.pause(300)
// //     })

// //     await step('Open "Connections"', async () => {
// //       const connections = await $('android=new UiSelector().textContains("Connections")')
// //       await connections.waitForDisplayed({ timeout: 15000 })
// //       await connections.click()
// //       await driver.pause(300)
// //     })

// //     await step('Tap (+) to add a new connection', async () => {
// //       // 1) Try common content-descs
// //       const addByDesc = await $$(
// //         'android=new UiSelector().descriptionMatches("(?i)(add|new|create|add connection)")'
// //       )
// //       if (await addByDesc.length) {
// //         await addByDesc[0].click()
// //         return
// //       }
// //       // 2) Try a floating action button by resource-id heuristic
// //       const fabIdGuess = await $$('android=new UiSelector().resourceIdMatches("(?i).*fab.*")')
// //       if (await fabIdGuess.length) {
// //         await fabIdGuess[0].click()
// //         return
// //       }
// //       // 3) Try last ImageButton on screen (often the + FAB)
// //       const imageButtons = await $$('android=new UiSelector().className("android.widget.ImageButton")')
// //       if (imageButtons.length) {
// //         await imageButtons[await imageButtons.length - 1].click()
// //         return
// //       }
// //       throw new Error('Could not find (+) Add button on Connections screen')
// //     })

// //     await step(`Type "${ASA_HOST}" into **Server Address**, then tap Done`, async () => {
// //       // Prefer the label "Server Address" → following EditText
// //       const lower = 'translate(@text,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")'
// //       const serverEdit = await $(`//android.widget.TextView[contains(${lower},"server address")]/following-sibling::android.widget.EditText[1]`)

// //       if (await serverEdit.isExisting()) {
// //         await serverEdit.click()
// //         await serverEdit.setValue(ASA_HOST)
// //       } else {
// //         // Fallback: among the EditTexts, the second is usually "Server Address"
// //         const edits = await $$('android=new UiSelector().className("android.widget.EditText")')
// //         if (await edits.length >= 2) {
// //           await edits[1].click()
// //           await edits[1].setValue(ASA_HOST)
// //         } else if (await edits.length === 1) {
// //           await edits[0].click()
// //           await edits[0].setValue(ASA_HOST)
// //         } else {
// //           throw new Error('No input fields found while adding ASA connection')
// //         }
// //       }

// //       // Hide the keyboard so bottom buttons are tappable
// //       try { await driver.hideKeyboard() } catch {}

// //       // Tap Done / OK / Save (explicitly; do NOT just press back)
// //       const done = await $('android=new UiSelector().textMatches("(?i)^done$")')
// //       if (await done.isExisting()) {
// //         await done.click()
// //       } else {
// //         const okOrSave = await $('android=new UiSelector().textMatches("(?i)^(ok|save|add)$")')
// //         if (await okOrSave.isExisting()) {
// //           await okOrSave.click()
// //         } else {
// //           // some OEMs put the action in the app bar menu
// //           await tryOpenOverflow()
// //           const saveMenu = await $('android=new UiSelector().textMatches("(?i)^(done|save|ok|add)$")')
// //           if (await saveMenu.isExisting()) {
// //             await saveMenu.click()
// //           } else {
// //             // very last resort
// //             await driver.back()
// //           }
// //         }
// //       }

// //       // Wait for we are back on the Connections list
// //       await driver.pause(500)
// //       // If ASA tile exists, tap it to go home
// //       const asaTile = await $(`android=new UiSelector().textContains("${ASA_HOST}")`)
// //       if (await asaTile.isExisting()) {
// //         await asaTile.click()
// //         await driver.pause(400)
// //       } else {
// //         // back to home safely
// //         await backToCiscoHome()
// //       }
// //     })

// //     await step('Open overflow (3-dots) → Settings', async () => {
// //       // Try to click a visible overflow button first
// //       const overflowBtn = await $('android=new UiSelector().descriptionMatches("(?i)(more options|more)")')
// //       if (await overflowBtn.isExisting()) {
// //         await overflowBtn.click()
// //       } else {
// //         // Press Android MENU key to open overflow reliably
// //         await tryOpenOverflow()
// //       }

// //       // Tap Settings
// //       const settings = await $('android=new UiSelector().textMatches("(?i)^settings$")')
// //       await settings.waitForExist({ timeout: 8000 })
// //       await settings.click()
// //     })

// //     await step('Uncheck "Block Untrusted Servers", then go back', async () => {
// //       // case-insensitive match using translate()+contains()
// //       const UNTRUSTED_CI =
// //         'contains(translate(@text,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"block untrusted servers")'

// //       const row = await $(`//android.widget.TextView[${UNTRUSTED_CI}]`)
// //       await row.waitForExist({ timeout: 12000 })

// //       // Try find a Switch/CheckBox in same row
// //       const toggle = await $(
// //         `//android.widget.TextView[${UNTRUSTED_CI}]/ancestor::*[1]` +
// //         `//*[self::android.widget.Switch or self::android.widget.CheckBox][1]`
// //       )
// //       if (await toggle.isExisting()) {
// //         const isChecked = (await toggle.getAttribute('checked')) === 'true'
// //         if (isChecked) {
// //           await toggle.click()
// //           await driver.pause(300)
// //         }
// //       } else {
// //         // fallback: tap the row to toggle if the UI is a simple list item
// //         await row.click()
// //         await driver.pause(300)
// //       }

// //       // Back to main/home
// //       await driver.back()
// //       await driver.pause(300)
// //     })

// //     await step('Tap AnyConnect VPN to bring up Connect dialog', async () => {
// //       // On home: a Switch is present (the AnyConnect toggle)
// //       const sw = await $('android=new UiSelector().className("android.widget.Switch")')
// //       await sw.waitForDisplayed({ timeout: 20000 })
// //       await sw.click()
// //     })

// //     await step('Security warning → tap Continue (untrusted certificate)', async () => {
// //       // dialog appears with a Continue/CONTINUE button
// //       const cont = await $('android=new UiSelector().textMatches("(?i)^continue$")')
// //       await cont.waitForExist({ timeout: 15000 })
// //       await cont.click()
// //       await driver.pause(500)
// //     })

// //     await step(`Select Group "${GROUP_LABEL}"`, async () => {
// //       // Focus the group input (AutoCompleteTextView)
// //       const input = await $('android=new UiSelector().className("android.widget.AutoCompleteTextView")')
// //       await input.waitForDisplayed({ timeout: 15000 })
// //       await input.click()
// //       await driver.pause(200)
// //       try { await input.clearValue() } catch {}
// //       await input.setValue(GROUP_LABEL)
// //       await driver.pause(500)
// //       // Hide keyboard so the list is visible
// //       try { await driver.hideKeyboard() } catch {}
// //       await driver.pause(300)

// //       // Pick exact text, or scroll it into view
// //       const exact = await $(`android=new UiSelector().text("${GROUP_LABEL}")`)
// //       if (await exact.isExisting()) {
// //         await exact.click()
// //       } else {
// //         try {
// //           await $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("${GROUP_LABEL}")`)
// //           const hit = await $(`android=new UiSelector().text("${GROUP_LABEL}")`)
// //           if (await hit.isExisting()) {
// //             await hit.click()
// //           } else {
// //             throw new Error('Group item not found after scroll')
// //           }
// //         } catch {
// //           // last chance: case-insensitive contains
// //           const ci = `new UiSelector().textMatches("(?i)^${escapeRx(GROUP_LABEL)}$")`
// //           const alt = await $(`android=${ci}`)
// //           await alt.waitForExist({ timeout: 5000 })
// //           await alt.click()
// //         }
// //       }
// //       await driver.pause(300)
// //     })

// //     await step('Enter Username & Password, then Connect', async () => {
// //       // Username
// //       const user = await $('//android.widget.EditText[@text="Username:"]')
// //       if (await user.isExisting()) {
// //         await user.click()
// //         await user.setValue(VPN_USER)
// //       } else {
// //         const edits = await $$('//android.widget.EditText')
// //         if (await edits.length) {
// //           await edits[0].click()
// //           await edits[0].setValue(VPN_USER)
// //         } else {
// //           throw new Error('Username field not found')
// //         }
// //       }

// //       // Password
// //       const pass = await $('//android.widget.EditText[@text="Password:"]')
// //       if (await pass.isExisting()) {
// //         await pass.click()
// //         await pass.setValue(VPN_PASS)
// //       } else {
// //         const edits = await $$('//android.widget.EditText')
// //         if (await edits.length >= 2) {
// //           await edits[1].click()
// //           await edits[1].setValue(VPN_PASS)
// //         } else {
// //           throw new Error('Password field not found')
// //         }
// //       }

// //       // Hide keyboard if covering the button
// //       try { await driver.hideKeyboard() } catch {}

// //       const connect = await $('//android.widget.Button[@text="Connect"]')
// //       await connect.waitForEnabled({ timeout: 15000 })
// //       await connect.click()
// //       await driver.pause(1500)
// //     })
// //   })
// // })

// // /* ---------------- helpers ---------------- */

// // async function tryOpenOverflow() {
// //   // First try to click the overflow icon if it exists
// //   const overflowBtn = await $('android=new UiSelector().descriptionMatches("(?i)(more options|more)")')
// //   if (await overflowBtn.isExisting()) {
// //     await overflowBtn.click()
// //     return
// //   }
// //   // Fallback: Android MENU key
// //   // Most stable on UIAutomator2:
// //   // @ts-ignore (wdio types may not declare it, Appium supports it)
// //   if (typeof (driver as any).pressKeyCode === 'function') {
// //     await (driver as any).pressKeyCode(82) // KEYCODE_MENU
// //   } else {
// //     // W3C mobile command
// //     // @ts-ignore
// //     await driver.execute('mobile: pressKey', { keycode: 82 })
// //   }
// //   await driver.pause(400)
// // }

// // async function backToCiscoHome() {
// //   for (let i = 0; i < 3; i++) {
// //     const title = await $('android=new UiSelector().textContains("Cisco Secure Client")')
// //     if (await title.isExisting()) return
// //     await driver.back().catch(() => {})
// //     await driver.pause(300)
// //   }
// // }

// // function escapeRx(s: string) {
// //   return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// // }


// test/specs/vpn-connect.e2e.ts
import { driver, $, $$ } from '@wdio/globals'
import { step, feature, story, severity } from '../utils/report'

/**
 * Flow:
 * 1) Open Cisco Secure Client
 * 2) Tap "Connections"
 * 3) Tap (+)
 * 4) Type ASA in Server Address
 * 5) Hide keyboard, tap Done/Save/OK
 * 6) Back to home
 * 7) Open 3-dots → Settings
 * 8) Uncheck "Block Untrusted Servers"
 * 9) Back to home
 * 10) Toggle "AnyConnect VPN"
 * 11) Tap "Continue" (waits for slow popup)
 * 12) Open Group dropdown (NO TYPING). Land on the 7th item (one below prior selection) and press ENTER
 * 13) Enter Username & Password, tap Connect
 * 14) Handle final OK/Okay popup if it appears
 */

const APP_PKG   = 'com.cisco.anyconnect.vpn.android.avf'

// ---- tweak here if needed (or via env vars) ----
const ASA_HOST  = process.env.ASA_HOST  || 'asa8.synocorp.net'
const VPN_USER  = process.env.VPN_USER  || 'skatem'
const VPN_PASS  = process.env.VPN_PASS  || 'SYNOcorp$3972'


const GROUP_TXT = process.env.CSC_GROUP || 'Split Inc (AAA)'
const FLOW = process.env.CURRENT_FLOW || 'Adhoc';


const GROUP_IDX = Number(process.env.GROUP_INDEX || 7)
// ------------------------------------------------

describe(`${FLOW} - VPN CONNECTION`, () => {
  it('Add ASA → tweak settings → connect with Split Inc (AAA)', async () => {
    feature('VPN Connection')
    story('Add ASA & connect with updated group')
    severity('normal')

    await step('Bring Cisco Secure Client to foreground', async () => {
      let pkg = ''
      try { pkg = await driver.getCurrentPackage() } catch {}
      if (pkg !== APP_PKG) await driver.activateApp(APP_PKG)
      await driver.pause(300)
    })

    await step('Open "Connections"', async () => {
      const connections = await $('android=new UiSelector().textContains("Connections")')
      await connections.waitForDisplayed({ timeout: 15000 })
      await connections.click()
      await driver.pause(300)
    })

    await step('Tap (+) to add a new connection', async () => {
      const byDesc = await $$('android=new UiSelector().descriptionMatches("(?i)(add|new|create|add connection)")')
      if (await byDesc.length) { await byDesc[0].click(); return }

      const fab = await $$('android=new UiSelector().resourceIdMatches("(?i).*fab.*")')
      if (await fab.length) { await fab[0].click(); return }

      const imgs = await $$('android=new UiSelector().className("android.widget.ImageButton")')
      if (imgs.length) { await imgs[await imgs.length - 1].click(); return }

      throw new Error('Could not find (+) Add button on Connections screen')
    })

    await step(`Type "${ASA_HOST}" into Server Address, then tap Done`, async () => {
      const lower = 'translate(@text,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")'
      const serverEdit = await $(`//android.widget.TextView[contains(${lower},"server address")]/following-sibling::android.widget.EditText[1]`)

      if (await serverEdit.isExisting()) {
        await serverEdit.click()
        await serverEdit.setValue(ASA_HOST)
      } else {
        const edits = await $$('android=new UiSelector().className("android.widget.EditText")')
        if (await edits.length >= 2) {
          await edits[1].click()
          await edits[1].setValue(ASA_HOST)
        } else if (await edits.length === 1) {
          await edits[0].click()
          await edits[0].setValue(ASA_HOST)
        } else {
          throw new Error('No input fields found while adding ASA connection')
        }
      }

      try { await driver.hideKeyboard() } catch {}

      const done = await $('android=new UiSelector().textMatches("(?i)^done$")')
      if (await done.isExisting()) {
        await done.click()
      } else {
        const okOrSave = await $('android=new UiSelector().textMatches("(?i)^(ok|save|add)$")')
        if (await okOrSave.isExisting()) {
          await okOrSave.click()
        } else {
          await tryOpenOverflow()
          const saveMenu = await $('android=new UiSelector().textMatches("(?i)^(done|save|ok|add)$")')
          if (await saveMenu.isExisting()) {
            await saveMenu.click()
          } else {
            await driver.back()
          }
        }
      }

      await driver.pause(500)

      const asaTile = await $(`android=new UiSelector().textContains("${ASA_HOST}")`)
      if (await asaTile.isExisting()) {
        await asaTile.click()
        await driver.pause(400)
      } else {
        await backToCiscoHome()
      }
    })

    await step('Open overflow (3-dots) → Settings', async () => {
      const overflowBtn = await $('android=new UiSelector().descriptionMatches("(?i)(more options|more)")')
      if (await overflowBtn.isExisting()) { await overflowBtn.click() } else { await tryOpenOverflow() }
      const settings = await $('android=new UiSelector().textMatches("(?i)^settings$")')
      await settings.waitForExist({ timeout: 8000 })
      await settings.click()
    })

    await step('Uncheck "Block Untrusted Servers", then go back', async () => {
      const UNTRUSTED_CI =
        'contains(translate(@text,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"block untrusted servers")'

      const row = await $(`//android.widget.TextView[${UNTRUSTED_CI}]`)
      await row.waitForExist({ timeout: 12000 })

      const toggle = await $(
        `//android.widget.TextView[${UNTRUSTED_CI}]/ancestor::*[1]` +
        `//*[self::android.widget.Switch or self::android.widget.CheckBox][1]`
      )
      if (await toggle.isExisting()) {
        const isChecked = (await toggle.getAttribute('checked')) === 'true'
        if (isChecked) { await toggle.click(); await driver.pause(300) }
      } else {
        await row.click()
        await driver.pause(300)
      }

      await driver.back()
      await driver.pause(300)
    })

    await step('Toggle AnyConnect VPN', async () => {
      const sw = await $('android=new UiSelector().className("android.widget.Switch")')
      await sw.waitForDisplayed({ timeout: 20000 })
      await sw.click()
      await driver.pause(200)
    })

    // ---------- FIX #1: Robust "Continue" handling with patient polling ----------
    await step('Security warning → tap Continue (waits if slow)', async () => {
      const deadline = Date.now() + 20000 // wait up to 20s for slow pop-up
      while (Date.now() < deadline) {
        // try variants
        const c1 = await $('android=new UiSelector().textMatches("(?i)^continue$")')
        if (await c1.isExisting()) { await c1.click(); await driver.pause(300); return }

        const c2 = await $('//android.widget.Button[translate(@text,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="continue"]')
        if (await c2.isExisting()) { await c2.click(); await driver.pause(300); return }

        const c3 = await $('android=new UiSelector().resourceIdMatches("(?i)(android:id/button1|.*button1.*)")')
        if (await c3.isExisting()) {
          const txt = (await c3.getText().catch(() => '')) || ''
          if (/continue/i.test(txt)) { await c3.click(); await driver.pause(300); return }
        }

        // sometimes dialog animates in — small sleep then re-check
        await driver.pause(350)
      }
      // no continue visible is fine on some builds; just proceed
    })
    // ---------------------------------------------------------------------------

    // ---------- FIX #2: Dropdown via DPAD to the **7th** item, then ENTER -------
    await step(`Open Group dropdown and select the target (index ${GROUP_IDX})`, async () => {
      const input = await $('android=new UiSelector().className("android.widget.AutoCompleteTextView")')
      await input.waitForDisplayed({ timeout: 15000 })
      await input.click()
      await driver.pause(120)

      // Open dropdown (tap input is enough on most builds)
      // Ensure dropdown really opened (several visible rows)
      await browser.waitUntil(async () => {
        const rows = await $$('android=new UiSelector().className("android.widget.TextView")')
        return await rows.length >= 3
      }, { timeout: 5000, timeoutMsg: 'Group dropdown did not open' })

      // Force highlight to the very top: a few UPs
      for (let i = 0; i < 8; i++) { await pressKey(19); await driver.pause(40) } // DPAD_UP

      // Move **down** to index (1-based). We use 7 (one below the previous overshoot).
      const target = GROUP_IDX > 1 ? GROUP_IDX : 7
      for (let i = 1; i < target; i++) {
        await pressKey(20) // DPAD_DOWN
        await driver.pause(110)
      }

      await pressKey(66) // ENTER
      await driver.pause(220)

      // If we still accidentally selected the item above (e.g., SCEP Proxy), nudge DOWN once and confirm.
      const chosen = await (async () => {
        try { return await input.getText() } catch { return await input.getAttribute('text') }
      })() || ''
      if (/scep\s*proxy/i.test(chosen) || (!/split\s*inc/i.test(chosen) && GROUP_TXT)) {
        await input.click()
        await driver.pause(120)
        await pressKey(20) // one more ↓ to move off the above item
        await driver.pause(110)
        await pressKey(66) // ENTER
        await driver.pause(220)
      }
    })
    // ---------------------------------------------------------------------------

    await step('Enter Username & Password, then Connect', async () => {
      // Username
      const user = await $('//android.widget.EditText[@text="Username:"]')
      if (await user.isExisting()) {
        await user.click()
        await user.setValue(VPN_USER)
      } else {
        const edits = await $$('//android.widget.EditText')
        if (await edits.length) {
          await edits[0].click()
          await edits[0].setValue(VPN_USER)
        } else {
          throw new Error('Username field not found')
        }
      }

      // Password
      const pass = await $('//android.widget.EditText[@text="Password:"]')
      if (await pass.isExisting()) {
        await pass.click()
        await pass.setValue(VPN_PASS)
      } else {
        const edits = await $$('//android.widget.EditText')
        if (await edits.length >= 2) {
          await edits[1].click()
          await edits[1].setValue(VPN_PASS)
        } else {
          throw new Error('Password field not found')
        }
      }

      try { await driver.hideKeyboard() } catch {}

      const connect = await $('//android.widget.Button[@text="Connect"]')
      await connect.waitForEnabled({ timeout: 15000 })
      await connect.click()
      await driver.pause(5000)

      // Final OK/Okay popup if appears
      const ok = await $('android=new UiSelector().textMatches("(?i)^(ok|okay)$")')
      if (await ok.isExisting()) {
        await ok.click()
        await driver.pause(300)
      }
    })
  })
})

/* ---------------- helpers ---------------- */

async function tryOpenOverflow() {
  const overflowBtn = await $('android=new UiSelector().descriptionMatches("(?i)(more options|more)")')
  if (await overflowBtn.isExisting()) {
    await overflowBtn.click()
    await driver.pause(200)
    return
  }
  try {
    // @ts-ignore
    await (driver as any).pressKeyCode(82) // MENU
  } catch {
    try {
      // @ts-ignore
      await driver.execute('mobile: pressKey', { keycode: 82 })
    } catch {}
  }
  await driver.pause(400)
}

async function backToCiscoHome() {
  for (let i = 0; i < 3; i++) {
    const title = await $('android=new UiSelector().textContains("Cisco Secure Client")')
    if (await title.isExisting()) return
    try { await driver.back() } catch {}
    await driver.pause(300)
  }
}

async function pressKey(code: number) {
  try {
    // @ts-ignore
    await (driver as any).pressKeyCode(code)
  } catch {
    try {
      // @ts-ignore
      await driver.execute('mobile: pressKey', { keycode: code })
    } catch {}
  }
}

