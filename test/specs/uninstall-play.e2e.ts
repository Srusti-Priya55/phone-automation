// test/specs/uninstall-play.e2e.ts
import { driver } from '@wdio/globals'
import { feature, story, severity, step } from '../utils/report'
import allure from '@wdio/allure-reporter'
import { expect } from 'chai'
import { labelSection } from '../utils/flow'
/** ---- Constants ---- */
const PLAY_PKG = 'com.android.vending'
const APP_PKG  = 'com.cisco.anyconnect.vpn.android.avf'
const APP_NAME = 'Cisco Secure Client'

/* ---------------- reusable runner ---------------- */
export async function runUninstallPlay() {
  await step('Open Play Store details page for CSC', async () => {
    await driver.pause(2000)
    await driver.execute('mobile: deepLink', {
      url: `market://details?id=${APP_PKG}`,
      package: PLAY_PKG,
    })
    await driver.pause(1200)
  })

  await step('Verify Uninstall button is present', async () => {
    await driver.pause(3000)
    const uninstallBtn = await getIfDisplayed(

      'android=new UiSelector().textMatches("(?i)^Uninstall$")'
    )
    if (!uninstallBtn) {
      throw new Error(
        `Expected an "Uninstall" button on ${APP_NAME}'s Play Store page, but none was found.\n` +
        `Possibly the app is already removed or the Play Store UI differs.`
      )
    }
  })

  await step('Click Uninstall and confirm', async () => {
    const uninstallBtn = await getIfDisplayed(
      'android=new UiSelector().textMatches("(?i)^Uninstall$")'
    )
    await uninstallBtn!.click()
    await driver.pause(2000)

    // Some devices show a confirm popup
    const confirmBtn = await getIfDisplayed(
      'android=new UiSelector().textMatches("(?i)^(uninstall|Uninstall)$")'
    )
    if (confirmBtn) {
      await confirmBtn.click()
      await driver.pause(2000)
    }
  })

  await step('Wait for Install button to reappear', async () => {
    const start = Date.now()
    const timeoutMs = 60_000
    const interval = 2000

    let seenInstall = false
    while (Date.now() - start < timeoutMs) {
      const installBtn = await getIfDisplayed(
        'android=new UiSelector().textMatches("(?i)^Install$")'
      )
      if (installBtn) {
        seenInstall = true
        break
      }
      await driver.pause(interval)
    }

    expect(seenInstall).to.equal(
      true,
      `"Install" button did not appear after clicking Uninstall — CSC may still be installed`
    )
  })
}

/* ---------------- the test ---------------- */

describe('Uninstall Cisco Secure Client via Play Store', () => {
  before(() => labelSection('Uninstall via Play Store'))

  it('navigates to Play Store, clicks Uninstall, and verifies removal', async () => {
    await runUninstallPlay()
  })
})


/* ---------------- helpers ---------------- */

/** Safe finder: returns element if it exists AND is displayed, else null */
async function getIfDisplayed(selector: string) {
  try {
    const el = await $(selector)
    if (await el.isDisplayed()) return el
  } catch {
    // ignore
  }
  return null
}
