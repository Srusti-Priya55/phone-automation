// test/specs/mode.e2e.ts
import { driver } from '@wdio/globals'
import { step } from '../utils/report'
import allure from '@wdio/allure-reporter'
const FLOW = process.env.CURRENT_FLOW || 'Adhoc';

const APP_PKG = 'com.cisco.anyconnect.vpn.android.avf'

describe(`${FLOW}-Disconnect VPN flow`, () => {
  it('should disconnect VPN from Cisco Secure Client', async () => {
    await step('Bring Cisco Secure Client to foreground', async () => {
      const pkg = await driver.getCurrentPackage().catch(() => '')
      if (pkg !== APP_PKG) {
        await driver.activateApp(APP_PKG)
      }
      await driver.pause(500)
    })

    await step('Tap AnyConnect VPN card', async () => {
      const vpnCard = await $('android=new UiSelector().textContains("AnyConnect VPN")')
      await vpnCard.waitForDisplayed({ timeout: 10000 })
      await vpnCard.click()
    })

    await step('Wait for VPN to disconnect', async () => {
      await driver.pause(4000) // adjust wait if needed
      const status = await driver.takeScreenshot()
      allure.addAttachment('After Disconnect', Buffer.from(status, 'base64'), 'image/png')
    })
  })
})
