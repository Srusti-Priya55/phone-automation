import { expect } from '@wdio/globals'
import allure from '@wdio/allure-reporter'
const FLOW = process.env.CURRENT_FLOW || 'Adhoc';

describe(`${FLOW}-NVM AUP notification`, () => {
  it('opens the shade, expands if needed, taps AUP row, waits, screenshots, closes', async () => {
    // 1) Open notifications
    await driver.openNotifications()
    await driver.pause(2000)

    // 2) Make sure the Cisco card is expanded (no getRect used)
    await expandCiscoCardIfCollapsed()

    // 3) Find and tap the "Please click here..." row
    const aupRow = await $(`android=new UiSelector().textContains("Please click here")`)
    // If still not visible, try one more expand/scroll attempt
    if (!(await aupRow.isExisting())) {
      await expandShadeGenerically()
    }
    await aupRow.waitForExist({ timeout: 5000 })
    await aupRow.click()

    // 4) Wait and screenshot whatever appears (AUP present or not)
    await driver.pause(4000)
    await attachShot('AUP screen')

    // 5) Close AUP if the Close button exists, else just go back
    const closeBtn = await $(`android=new UiSelector().textMatches("(?i)close")`)
    if (await closeBtn.isExisting()) {
      await closeBtn.click()
    } else {
      await driver.back()
    }
  })
})

/** Try all safe, no-element-rect ways to expand the Cisco notification card */
async function expandCiscoCardIfCollapsed() {
  // A) Tap the expand chevron/button if SystemUI exposes it
  //    (works on most Pixel/Samsung devices)
  const expandBtn = await $(`android=new UiSelector().resourceIdMatches(".*:id/expand_button")`)
  if (await expandBtn.isExisting()) {
    await expandBtn.click()
    await driver.pause(300)
  }

  // B) If AUP row still not visible, try a generic swipe down in the shade
  const aupRow = await $(`android=new UiSelector().textContains("Please click here")`)
  if (!(await aupRow.isExisting())) {
    await expandShadeGenerically()
  }

  // C) As a last resort, scroll the shade container to bring the row into view
  if (!(await aupRow.isExisting())) {
    const scroller =
      'new UiScrollable(new UiSelector().scrollable(true))' +
      '.scrollIntoView(new UiSelector().textContains("Please click here"))'
    try { await $(`android=${scroller}`) } catch {}
    await driver.pause(1000)
  }
}

/** Do a general swipe down in the notification shade using only window size */
async function expandShadeGenerically() {
  const win = await driver.getWindowRect()
  const x = Math.floor(win.width / 2)
  const yStart = Math.floor(win.height * 0.30)
  const yEnd   = Math.floor(win.height * 0.80)
  await driver.touchPerform([
    { action: 'press', options: { x, y: yStart } },
    { action: 'wait',  options: { ms: 350 } },
    { action: 'moveTo', options: { x, y: yEnd } },
    { action: 'release' }
  ])
  await driver.pause(2000)
}

/** Attach a screenshot to Allure (PNG) */
async function attachShot(name: string) {
  const b64 = await driver.takeScreenshot()
  allure.addAttachment(name, Buffer.from(b64, 'base64'), 'image/png')
}